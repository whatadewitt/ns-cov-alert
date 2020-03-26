const request = require("request");
const HTMLParser = require("node-html-parser");
const path = require("path");
const fs = require("fs");
const NotificationCenter = require("node-notifier").NotificationCenter;

const notifier = new NotificationCenter({
  withFallback: false, // Use Growl Fallback if <= 10.8
  customPath: undefined // Relative/Absolute path to binary if you want to use your own fork of terminal-notifier
});

const dataFile = "./savedData.json";
const sourceNs = "https://novascotia.ca/coronavirus/";

const savedData = JSON.parse(fs.readFileSync(dataFile, "utf8"));

const numberWithCommas = x =>
  x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const checkCovid = () => {
  request({ url: sourceNs, strictSSL: false }, (error, response, body) => {
    const content = HTMLParser.parse(body);
    const tableData = content.querySelectorAll("#corona-data td");
    const tableTitle = content.querySelector("#cases p");

    if (!tableData || !tableTitle) {
      console.log("Page data updated, please adjust the selectors.");
      console.log(new Date());
      return;
    }

    const newData = {
      date: /((?<=Updated )(.*?)(?=\.))/g.exec(tableTitle.text)[0],
      positive: parseInt(tableData[0].text.replace(",", ""), 10),
      negative: parseInt(tableData[1].text.replace(",", ""), 10)
    };

    if (savedData.date !== newData.date) {
      fs.writeFileSync(dataFile, JSON.stringify(newData));

      notifier.notify({
        title: `COVID-19 NS Update: ${newData.date}`,
        message: `Positive: ${numberWithCommas(
          newData.positive
        )} (+${numberWithCommas(
          newData.positive - savedData.positive
        )})\nNegative: ${numberWithCommas(
          newData.negative
        )} (+${numberWithCommas(newData.negative - savedData.negative)})`,
        icon: path.join(__dirname, "virus.png"),
        sound: "Ping",
        timeout: 15,
        wait: true,
        open: sourceNs
      });
    }

    setTimeout(checkCovid, 1000 * 60 * 15);
  });
};

checkCovid();
