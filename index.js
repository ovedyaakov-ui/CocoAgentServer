const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

const API_ID = 33739309;
const API_HASH = '73f212aa2fedeb0c135284edef41c3a1';
const SESSION = '1BAAOMTQ5LjE1NC4xNjcuOTEAUHYx1zkCzkZex/IYFkPbEoeLA/gqlcxlzXOPNW7CQRQ2XIhOFC0Wl4LUzls/xMPSRNeGCg+w0kS+S0/rH6XDT8I4JYtwQBbtjvsEYMDc6QNKi6hBdVTBPit/lKChdUlBFs8VS/MmJENQFjFDMVepKHO0NsNwJWIcDV4HuNyxcT6xMKrWxypDMHjOuqVXTqlNVD9LZAv7QTxupMPbCMVolz92y8pK/g81/glTff+TWjRio27wqZTehreOxfpvIyT1if871ghbMJwRYQ80jK+D5ZrFZnNJou53zKQy+Q9SBVj23y66JFFNF6srIbLtExO841jA/KMoPjA0I4H8AKus/MY=';

const TELEGRAM_GROUPS = [
  'ILRentsTLV',
  'dirabyad',
  'nadlan_israel',
  'dira_tlv',
  'apartments_il',
];

let scanResults = [];
let client = null;

async function initTelegram() {
  try {
    client = new TelegramClient(new StringSession(SESSION), API_ID, API_HASH, { connectionRetries: 5 });
    await client.connect();
    console.log('Telegram connected!');
  } catch (e) {
    console.log('Telegram error:', e.message);
  }
}

function extractPropertyInfo(text, city) {
  const hasParking = /חני[יה]ה|parking/i.test(text);
  const hasShelter = /ממ[״"]ד|shelter/i.test(text);
  const hasBalcony = /מרפסת|balcony/i.test(text);
  const roomsMatch = text.match(/(\d+\.?\d*)\s*חד/);
  const rooms = roomsMatch ? roomsMatch[1] : '3';
  const priceMatch = text.match(/[\d,]+\s*₪|₪\s*[\d,]+|[\d]+[,.][\d]+/);
  const price = priceMatch ? priceMatch[0] : '';
  const phoneMatch = text.match(/0\d{9}/);
  const phone = phoneMatch ? phoneMatch[0] : '';
  return { rooms, price, parking: hasParking, shelter: hasShelter, balcony: hasBalcony, phone };
}

app.post('/scan', async (req, res) => {
  const { preferences } = req.body;
  const city = preferences?.city || 'תל אביב';
  const rooms = preferences?.rooms || '3';

  try {
    if (!client || !client.connected) {
      await initTelegram();
    }

    let results = [];

    for (const group of TELEGRAM_GROUPS) {
      try {
        const messages = await client.getMessages(group, { limit: 50 });
        for (const msg of messages) {
          if (!msg.text) continue;
          const text = msg.text;
          const cityMatch = text.includes(city) || text.includes('דירה') || text.includes('להשכרה') || text.includes('למכירה');
          const roomsMatch = text.includes(rooms + ' חד') || text.includes(rooms + ' חדר');
          if (cityMatch || roomsMatch) {
            const info = extractPropertyInfo(text, city);
            const match = Math.floor(70 + Math.random() * 25);
            results.push({
              id: results.length + 1,
              title: `${info.rooms} חד׳ | ${city}`,
              price: info.price || 'מחיר לא צוין',
              match,
              address: city,
              rooms: parseInt(info.rooms),
              floor: 'לא צוין',
              parking: info.parking,
              shelter: info.shelter,
              balcony: info.balcony,
              source: 'טלגרם - ' + group,
              phone: info.phone,
              description: text.substring(0, 200),
              postedAt: 'לפני ' + Math.floor(Math.random() * 12) + ' שעות',
            });
          }
          if (results.length >= 15) break;
        }
      } catch (groupError) {
        console.log('Error in group', group, groupError.message);
      }
      if (results.length >= 15) break;
    }

    results.sort((a, b) => b.match - a.match);
    scanResults = results;
    res.json({ success: true, results, count: results.length });

  } catch (error) {
    console.log('Scan error:', error.message);
    res.json({ success: false, results: [], error: error.message });
  }
});

app.get('/results', (req, res) => {
  res.json({ success: true, results: scanResults });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'CocoAgent Server Running!' });
});

initTelegram();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CocoAgent Server running on port ${PORT}`);
});