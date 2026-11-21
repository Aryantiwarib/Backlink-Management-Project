import './loadEnv.js';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

export const configurePassport = () => {
  // 1. Local Strategy (Email & Password)
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: false
      },
      async (email, password, done) => {
        try {
          if (!email || !password) {
            return done(null, false, { message: 'Email and password are required' });
          }

          const normalizedEmail = email.trim().toLowerCase();
          const user = await User.findOne({ email: normalizedEmail });

          if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          // Check if user is a Google-only account without a local password
          if (!user.password) {
            return done(null, false, {
              message: 'This account was registered using Google. Please click "Continue with Google" to sign in.'
            });
          }

          const isMatch = await user.comparePassword(password);
          if (!isMatch) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // 2. Google OAuth 2.0 Strategy
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL?.trim() || '/auth/google/callback';

  if (googleClientId && googleClientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleClientId,
          clientSecret: googleClientSecret,
          callbackURL: googleCallbackUrl,
          proxy: true,
          passReqToCallback: true
        },
        async (req, accessToken, refreshToken, profile, done) => {
          try {
            const googleId = profile.id;
            const email = profile.emails?.[0]?.value?.trim().toLowerCase();
            const displayName =
              profile.displayName ||
              `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() ||
              'Google User';
            const avatar = profile.photos?.[0]?.value || null;

            if (!email) {
              return done(new Error('Google profile did not contain an email address'), null);
            }

            // Step 1: Look for user with this Google ID
            let user = await User.findOne({ googleId });

            if (user) {
              // Existing Google-linked user
              let modified = false;
              if (avatar && !user.avatar) {
                user.avatar = avatar;
                modified = true;
              }
              if (!user.providers.includes('google')) {
                user.providers.push('google');
                modified = true;
              }
              if (modified) {
                await user.save();
              }
              return done(null, user);
            }

            // Step 2: Check if user exists with the same verified email
            user = await User.findOne({ email });

            if (user) {
              // Safety check: Never overwrite an existing different Google account
              if (user.googleId && user.googleId !== googleId) {
                return done(
                  new Error('This email is already associated with a different Google account.'),
                  null
                );
              }

              // Safely link Google credentials to existing account
              user.googleId = googleId;
              if (!user.providers.includes('google')) {
                user.providers.push('google');
              }
              if (avatar && !user.avatar) {
                user.avatar = avatar;
              }

              await user.save();
              console.log(`🔗 Safely linked Google account for existing user: ${user.email}`);
              return done(null, user);
            }

            // Step 3: Create a brand new Google-authenticated user (no password required)
            const newUser = new User({
              name: displayName,
              email: email,
              googleId: googleId,
              avatar: avatar,
              providers: ['google'],
              role: 'user'
            });

            await newUser.save();
            console.log(`✨ New user registered via Google Sign-In: ${newUser.email}`);
            return done(null, newUser);
          } catch (error) {
            console.error('Google OAuth strategy verification error:', error);
            return done(error, null);
          }
        }
      )
    );
  } else {
    console.warn('⚠️ Google OAuth credentials not configured in environment variables.');
  }

  // Session Serialization
  passport.serializeUser((user, done) => {
    done(null, user.id || user._id.toString());
  });

  // Session Deserialization
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).select('-password');
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  return passport;
};

export default passport;
