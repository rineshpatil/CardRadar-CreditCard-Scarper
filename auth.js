const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const res = await pool.query('SELECT id, name, email, google_id FROM users WHERE id = $1', [id]);
    if (res.rows.length > 0) {
      done(null, res.rows[0]);
    } else {
      done(null, false);
    }
  } catch (error) {
    done(error);
  }
});

// Local Strategy for Email/Password
passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  try {
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = res.rows[0];

    if (!user) {
      return done(null, false, { message: 'No user found with this email.' });
    }

    if (!user.password) {
      return done(null, false, { message: 'This account uses Google Login.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return done(null, false, { message: 'Incorrect password.' });
    }

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Google Strategy
// Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'stub-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'stub-secret',
    callbackURL: '/api/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let res = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
      
      if (res.rows.length === 0) {
        // Maybe email is already registered?
        const email = profile.emails[0].value;
        const name = profile.displayName;
        
        let existingEmail = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingEmail.rows.length > 0) {
          // Link google_id to existing account
          let updated = await pool.query(
            'UPDATE users SET google_id = $1 WHERE email = $2 RETURNING *',
            [profile.id, email]
          );
          return done(null, updated.rows[0]);
        }

        // Create new user
        let newUser = await pool.query(
            'INSERT INTO users (name, email, google_id) VALUES ($1, $2, $3) RETURNING *',
            [name, email, profile.id]
        );
        return done(null, newUser.rows[0]);
      }
      
      return done(null, res.rows[0]);
    } catch (error) {
      return done(error);
    }
  }
));

module.exports = passport;
