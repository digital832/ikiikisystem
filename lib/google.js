const { google } = require("googleapis");

const authOptions = {
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/devstorage.read_write",
  ],
};
// ローカル開発ではキーファイルを使い、Cloud Run本番では実行サービスアカウント（ADC）を使う
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  authOptions.keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const auth = new google.auth.GoogleAuth(authOptions);

const sheets = google.sheets({ version: "v4", auth });
const storage = google.storage({ version: "v1", auth });

module.exports = { sheets, storage };
