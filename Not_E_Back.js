let fs = require("fs");
let path = require('path');
let express = require('express');
let app = express();
app.use(express.json({ limit: "500mb" }));
let cors = require('cors');
let corsOptions = { origin: '*', methods: 'GET,HEAD,PUT,PATCH,POST,DELETE' };
app.use(cors(corsOptions));

let mainDir = "/mnt/chromeos/MyFiles/Downloads/sketches"; // << YOUR FOLDER HERE

app.post('/savesketch', async (req, res) => {
    let sketchJson = JSON.parse(req.body.json);
    let sketchJpg = req.body.jpg;
    let sketchName = req.body.sketchName;
    let isNewName = req.body.isNewName;

    let activeDir = mainDir;

    let presentSketches = fs.readdirSync(activeDir);

    let version;

    if (isNewName == true) {
        if (presentSketches.includes(sketchName) == true) {
            res.send({ status: "duplicate" });
            return;
        }
    }

    if (presentSketches.includes(sketchName) == false) {
        fs.mkdirSync(path.join(activeDir, sketchName));
        activeDir = path.join(activeDir, sketchName);
        version = "0";

        fs.mkdirSync(path.join(activeDir, version));
        activeDir = path.join(activeDir, version);
    } else {
        activeDir = path.join(activeDir, sketchName);

        let allVersions = fs.readdirSync(activeDir);
        allVersions.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }));
        let latestVersion = allVersions[allVersions.length - 1];
        version = String(Number(latestVersion) + 1);

        fs.mkdirSync(path.join(activeDir, version));
        activeDir = path.join(activeDir, version);
    }

    fs.writeFileSync(path.join(activeDir, `${version}.json`), JSON.stringify(sketchJson));
    fs.writeFileSync(path.join(activeDir, `${version}.jpg`), sketchJpg, "base64");

    res.send({ status: "ok" });
});

app.get('/numberofsketches', async (req, res) => {
    let number = getNumberOfSketches();
    res.json({ number: number });
});

app.post("/delete", async (req, res) => {
    try {
        let sketchName = req.body.sketchName;
        fs.rmSync(path.join(mainDir, sketchName), { recursive: true, force: true });

        res.json({ status: "ok" });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

app.post("/rename", async (req, res) => {
    try {
        const sketchName = req.body.sketchName;
        const newName = req.body.newName;

        const oldPath = path.join(mainDir, sketchName);
        const newPath = path.join(mainDir, newName);

        if (fs.existsSync(newPath)) {
            return res.status(400).json({ status: "duplicate" });
        }

        fs.renameSync(oldPath, newPath);

        res.json({ status: "ok" });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

app.post('/getsketch', async (req, res) => {
    let index = req.body.index;
    let sketch = getSketch(index);
    res.json(sketch);
});

function getSketch(index) {
    let allsketches = getFilesSortedByMtime(mainDir);
    allsketches = allsketches.filter(e => !e.startsWith("."));

    let sketchName = allsketches[index];

    let versions = fs.readdirSync(path.join(mainDir, sketchName));
    versions.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }));
    let latest = versions[versions.length - 1];
    let the2files = fs.readdirSync(path.join(mainDir, sketchName, latest));
    let jsonFileName = the2files.find(file => file.endsWith('.json'));
    let jpgFileName = the2files.find(file => file.endsWith('.jpg') || file.endsWith('.jpeg'));
    let jsoncontent = fs.readFileSync(path.join(mainDir, sketchName, latest, jsonFileName), "utf8");
    jsoncontent = JSON.parse(jsoncontent);
    let jpegcontent = fs.readFileSync(path.join(mainDir, sketchName, latest, jpgFileName));

    return { jsonContent: jsoncontent, jpegContent: jpegcontent, sketchName: sketchName };
}

function getNumberOfSketches() {
    let allsketches = fs.readdirSync(mainDir);
    allsketches = allsketches.filter(e => e != ".sync");
    return allsketches.length;
}

function getFilesSortedByMtime(dir) {
    let files = fs.readdirSync(dir);
    files = files.map(file => {
        let fullPath = path.join(dir, file);
        let stats = fs.statSync(fullPath);
        return { file, mtime: stats.mtime };
    });
    files.sort((a, b) => b.mtime - a.mtime);
    return files.map(f => f.file);
}

app.listen(4073, '0.0.0.0', () => { console.log('listening'); });