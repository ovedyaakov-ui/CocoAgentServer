const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());
app.use(express.json());

// נתוני טלגרם
const API_ID = 33739309;
const API_HASH = '73f212aa2fedeb0c135284edef41c3a1';

// קבוצות טלגרם לסריקה
const TELEGRAM_GROUPS = [
  'dirabyad',
  'nadlan_israel',
  'dira_tlv',
  'apartments_il',
];

// מאגר זמני לתוצאות
let scanResults = [];

// נקודת קצה – סריקה
app.post('/scan', async (req, res) => {
  const { preferences } = req.body;

  try {
    // כרגע – נתונים מדומים (אחר כך אמיתיים)
    const results = generateMockResults(preferences);
    scanResults = results;
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// נקודת קצה – תוצאות אחרונות
app.get('/results', (req, res) => {
  res.json({ success: true, results: scanResults });
});

// נקודת קצה – בדיקת חיבור
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'CocoAgent Server Running!' });
});

// יצירת תוצאות מדומות לפי העדפות
function generateMockResults(preferences) {
  const city = preferences?.city || 'תל אביב';
  const rooms = preferences?.rooms || '3';
  const budget = preferences?.budget || 'עד ₪2M';

  return [
    {
      id: 1,
      title: `${rooms} חד׳ | ${city}`,
      price: '₪2,200,000',
      match: 95,
      address: `רחוב הרצל 15, ${city}`,
      rooms: parseInt(rooms),
      floor: 'גבוהה',
      parking: true,
      shelter: true,
      balcony: true,
      source: 'טלגרם',
      phone: '0501234567',
      description: 'דירה מרווחת ומוארת, שיפוץ מלא, קרוב לתחבורה.',
      postedAt: 'לפני 2 שעות',
    },
    {
      id: 2,
      title: `${rooms} חד׳ | ${city}`,
      price: '₪1,950,000',
      match: 87,
      address: `שדרות רוטשילד 8, ${city}`,
      rooms: parseInt(rooms),
      floor: 'נמוכה',
      parking: false,
      shelter: true,
      balcony: false,
      source: 'nadlan.gov.il',
      phone: '0509876543',
      description: 'דירה נעימה בלב העיר, קרובה לכל השירותים.',
      postedAt: 'לפני 5 שעות',
    },
    {
      id: 3,
      title: `${parseInt(rooms) + 1} חד׳ | ${city}`,
      price: '₪2,500,000',
      match: 79,
      address: `רחוב דיזנגוף 22, ${city}`,
      rooms: parseInt(rooms) + 1,
      floor: 'פנטהאוז',
      parking: true,
      shelter: false,
      balcony: true,
      source: 'טלגרם',
      phone: '0521111222',
      description: 'פנטהאוז יוקרתי עם נוף מרהיב.',
      postedAt: 'לפני שעה',
    },
  ];
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CocoAgent Server running on port ${PORT}`);
});