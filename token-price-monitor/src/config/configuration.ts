export default () => ({
  ai: {
    apiKey: process.env.AI_API_KEY || 'sk-abb9202dd0b549ccba9fc2bb85334505',
  },
  priceStream: {
    url: process.env.PRICE_STREAM_URL || 'https://nest-gbm-stock.vercel.app',
  },
});
