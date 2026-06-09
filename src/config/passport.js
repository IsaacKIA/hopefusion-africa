import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { db } from './db.js';

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/v1/auth/google/callback`,
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('No email returned from Google'));
      }

      // Check if user already exists
      const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      let user = rows[0];

      // Retrieve requested role from state
      const role = req.query.state || 'startup';

      if (!user) {
        const firstName = profile.name?.givenName || profile.displayName || 'Google';
        const lastName = profile.name?.familyName || 'User';
        const avatarUrl = profile.photos?.[0]?.value;

        const client = await db.connect();
        try {
          await client.query('BEGIN');
          
          const insertUserRes = await client.query(
            `INSERT INTO users (email, role, first_name, last_name, avatar_url, is_verified, oauth_provider, oauth_id)
             VALUES ($1, $2, $3, $4, $5, TRUE, 'google', $6)
             RETURNING id, email, role, first_name, last_name`,
            [email, role, firstName, lastName, avatarUrl, profile.id]
          );
          user = insertUserRes.rows[0];

          if (role === 'startup') {
            await client.query(
              'INSERT INTO startups (founder_id, name, sector, country) VALUES ($1, $2, $3, $4)',
              [user.id, `${firstName}'s Startup`, 'general', 'Ghana']
            );
          } else if (role === 'investor') {
            await client.query('INSERT INTO investors (user_id) VALUES ($1)', [user.id]);
          } else if (role === 'mentor') {
            await client.query('INSERT INTO mentors (user_id) VALUES ($1)', [user.id]);
          }

          await client.query('COMMIT');
        } catch (txErr) {
          await client.query('ROLLBACK');
          throw txErr;
        } finally {
          client.release();
        }
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, rows[0]);
  } catch (err) {
    done(err);
  }
});
