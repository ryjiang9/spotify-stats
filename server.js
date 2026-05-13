require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.static('public'));

const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, REDIRECT_URI, PORT, TICKETMASTER_API_KEY } = process.env;

const scopes = [
  'user-top-read',
  'user-read-recently-played',
  'user-read-private',
  'user-read-email',
].join(' ');

const spotifyHeaders = (token) => ({ Authorization: `Bearer ${token}` });

app.get('/login', (req, res) => {
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: scopes,
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

app.get('/callback', async (req, res) => {
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token',
      new URLSearchParams({ grant_type: 'authorization_code', code: req.query.code, redirect_uri: REDIRECT_URI }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
        },
      }
    );
    res.redirect(`/?token=${response.data.access_token}`);
  } catch { res.status(500).send('Auth failed'); }
});

app.get('/api/me', async (req, res) => {
  try {
    const { data } = await axios.get('https://api.spotify.com/v1/me', { headers: spotifyHeaders(req.query.token) });
    res.json(data);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/top-artists', async (req, res) => {
  try {
    const { data } = await axios.get('https://api.spotify.com/v1/me/top/artists', {
      headers: spotifyHeaders(req.query.token),
      params: { limit: 50, time_range: req.query.range || 'medium_term' },
    });
    res.json(data);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/top-tracks', async (req, res) => {
  try {
    const { data } = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
      headers: spotifyHeaders(req.query.token),
      params: { limit: 50, time_range: req.query.range || 'medium_term' },
    });
    res.json(data);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/recent', async (req, res) => {
  try {
    const { data } = await axios.get('https://api.spotify.com/v1/me/player/recently-played', {
      headers: spotifyHeaders(req.query.token),
      params: { limit: 50 },
    });
    res.json(data);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/artist/:id', async (req, res) => {
  try {
    const { data } = await axios.get(`https://api.spotify.com/v1/artists/${req.params.id}`, {
      headers: spotifyHeaders(req.query.token),
    });
    res.json(data);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/artist/:id/albums', async (req, res) => {
  try {
    const { data } = await axios.get(`https://api.spotify.com/v1/artists/${req.params.id}/albums`, {
      headers: spotifyHeaders(req.query.token),
      params: { limit: 10, include_groups: 'album,single', market: 'US' },
    });
    res.json(data);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/artist/:id/related', async (req, res) => {
  try {
    const { data } = await axios.get(`https://api.spotify.com/v1/artists/${req.params.id}/related-artists`, {
      headers: spotifyHeaders(req.query.token),
    });
    res.json(data);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/artist/:id/top-tracks', async (req, res) => {
  try {
    const { data } = await axios.get(`https://api.spotify.com/v1/artists/${req.params.id}/top-tracks`, {
      headers: spotifyHeaders(req.query.token),
      params: { market: 'US' },
    });
    res.json(data);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/artists-batch', async (req, res) => {
  try {
    const { data } = await axios.get('https://api.spotify.com/v1/artists', {
      headers: spotifyHeaders(req.query.token),
      params: { ids: req.query.ids },
    });
    res.json(data);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/concerts', async (req, res) => {
  if (!TICKETMASTER_API_KEY) return res.json({ events: [], noKey: true });
  try {
    const { data } = await axios.get('https://app.ticketmaster.com/discovery/v2/events.json', {
      params: {
        apikey: TICKETMASTER_API_KEY,
        keyword: req.query.artist,
        size: 5,
        sort: 'date,asc',
        classificationName: 'music',
      },
    });
    res.json({ events: data._embedded?.events || [] });
  } catch { res.json({ events: [] }); }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Running at http://0.0.0.0:${PORT}`));
