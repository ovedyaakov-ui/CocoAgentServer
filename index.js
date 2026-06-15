const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

const API_ID = 33739309;
const API_HASH = '73f212aa2fedeb0c135284edef41c3a1';
const SESSION = '1BAAOMTQ5LjE1NC4xNjcuOTEAUFwOOctA+U9nvgv1ML+g5WnCpdddiZzkZMMGMOqJ2zFASP+KDEvt6F530EKisu5+6wjXOCAdulEBvBAy/tqZrMZGJd3R0dOYuKpWoyiREFcUsjcFyRqxsw24PMPQsVUMM6OUp7Io4G7JwRrTBmuh1MhmjCge361ttNvOB8BBxm+M/PTkmsiheOntmhsuApbBqrnUDPuR6WP1G9tsBJuYqUzsUhC0wxDQcs59U1hPS/uFeiPUuY/CoS+PwGoIP6dDaoM1UiB0r7ZpfhS5wOR76Tz0rp8KEBA7i8canWCpoxFhLceOVqKmNBLQ7G12st1QeYa9QIcA/ImyAq9LX15e0kE=';

// קבוצות לפי סוג עסקה
const GROUPS_RENT = [
  'ILRentsTLV',
  'dira_tlv',
  'apartments_il',
];

const GROUPS_BUY = [
  'dirabyad',
  'nadlan_israel',
];

const GROUPS_ALL = [...new Set([...GROUPS_RENT, ...GROUPS_BUY])];

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

function extractPropertyInfo(text) {
  const hasParking = /חני[יה]ה|parking/i.test(text);
  const hasShelter = /ממ[״"]ד|shelter/i.test(text);
  const hasBalcony = /מרפסת|balcony/i.test(text);
  const roomsMatch = text.match(/(\d+\.?\d*)\s*חד/);
  const rooms = roomsMatch ? roomsMatch[1] : '3';
  const priceMatch = text.match(/[\d,]+\s*₪|₪\s*[\d,]+/);
  const price = priceMatch ? priceMatch[0] : '';
  const phoneMatch = text.match(/0\d{9}/);
  const phone = phoneMatch ? phoneMatch[0] : '';
  return { rooms, price, parking: hasParking, shelter: hasShelter, balcony: hasBalcony, phone };
}

function isRentMessage(text) {
  return /להשכרה|שכירות|שכ"ד|לשכירה/i.test(text);
}

function isBuyMessage(text) {
  return /למכירה|מכירה|לרכישה/i.test(text);
}

app.post('/scan', async (req, res) => {
  const { preferences } = req.body;
  const city = preferences?.city || 'תל אביב';
  const rooms = preferences?.rooms || '3';
  const type = preferences?.type || 'קנייה'; // קנייה / השכרה
  const isRent = type === 'השכרה';

  try {
    if (!client || !client.connected) {
      await initTelegram();
    }

    // בחר קבוצות לפי סוג עסקה
    const groups = isRent ? GROUPS_RENT : GROUPS_BUY;

    let results = [];

    for (const group of groups) {
      try {
        const messages = await client.getMessages(group, { limit: 100 });
        for (const msg of messages) {
          if (!msg.text) continue;
          const text = msg.text;

          // סינון לפי עיר
          const cityMatch = text.includes(city);
          // סינון לפי חדרים
          const roomsMatch = text.includes(rooms + ' חד') || text.includes(rooms + ' חדר') || text.includes(rooms + '.0 חד');
          // סינון לפי סוג עסקה בטקסט
          const typeMatch = isRent ? isRentMessage(text) : isBuyMessage(text);

          if (cityMatch || roomsMatch || typeMatch) {
            const info = extractPropertyInfo(text);
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
              type: isRent ? 'השכרה' : 'קנייה',
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