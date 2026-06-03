import { useState, useRef } from "react";

const COLOR_FILE_MAP = {
  "Red":"red","White":"white","Blue":"blue","Green":"green",
  "Yellow/Orange":"yellow-orange","Pink/Purple":"pink-purple",
  "Beige/Brown":"beige-brown","Gray":"gray","Black":"black",
  "Silver":"silver","Gold":"gold","Wood":"wood","Clear":"clear"
};
const COLOR_PREFIX = {
  "Red":"r","Green":"g","Yellow/Orange":"yo","Pink/Purple":"pp",
  "Beige/Brown":"bb","Blue":"bl","Gray":"gr","Black":"bk",
  "White":"w","Silver":"sl","Gold":"gd","Wood":"wd","Clear":"cl"
};
const CAT_PREFIX = {
  "Plates":"p","Bowls":"b","Ramekins":"r",
  "Cups & Mugs":"cm","Glasses":"gl","Jars & Bottles":"jb",
  "Baskets & Trays":"bt","Boards & Stands":"bs","Pots & Pans":"pp",
  "Pitchers & Vases":"pv","Containers":"cn","Tools & Accessories":"ta"
};
const COLOR_SWATCHES = {
  "Red":"#D94040","Green":"#4CAF50","Yellow/Orange":"#FFA726",
  "Pink/Purple":"#CE93D8","Beige/Brown":"#BCAAA4","Blue":"#42A5F5",
  "Gray":"#90A4AE","Black":"#666","White":"#AAAAAA",
  "Silver":"#B0BEC5","Gold":"#FFD54F","Wood":"#A1887F","Clear":"#B0D0F0"
};
const CATEGORIES = [
  "Plates","Bowls","Ramekins","Cups & Mugs","Glasses",
  "Jars & Bottles","Baskets & Trays","Boards & Stands",
  "Pots & Pans","Pitchers & Vases","Containers","Tools & Accessories"
];

function compressImage(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onerror = function() { reject(new Error("Could not read file")); };
    reader.onload = function(e) {
      var img = new Image();
      img.onerror = function() { reject(new Error("Could not decode image")); };
      img.onload = function() {
        var canvas = document.createElement("canvas");
        var w = img.width, h = img.height;
        var maxDim = 512;
        if (w > h && w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; }
        else if (h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function autoDescribe(b64) {
  var base64 = b64.split(",")[1];
  var prompt = "You are cataloging prop vessels for a food photography studio. Look at this vessel and respond with JSON only, no markdown, no explanation. Return exactly: {\"description\":\"[Shape] [Type], [Finish] [Color], [Key Feature], [Secondary Feature]\",\"category\":\"[one category]\"} Categories: Plates, Bowls, Ramekins, Cups & Mugs, Glasses, Jars & Bottles, Baskets & Trays, Boards & Stands, Pots & Pans, Pitchers & Vases, Containers, Tools & Accessories. Example: {\"description\":\"Round Ramekin, Glossy White, Straight Walls, Deep Well\",\"category\":\"Ramekins\"}";

  var res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-dangerous-direct-browser-calls": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
          { type: "text", text: prompt }
        ]
      }]
    })
  });
  var text = await res.text();
  var data;
  try { data = JSON.parse(text); }
  catch(e) {
    var preview = text.slice(0, 120).replace(/\n/g, " ");
    throw new Error("API returned non-JSON response: " + preview);
  }
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  if (!data.content || !data.content[0]) throw new Error("Empty response from API");
  var raw = data.content[0].text ? data.content[0].text.trim() : "";
  raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim();
  try {
    var parsed = JSON.parse(raw);
    return {
      description: (parsed.description || "").replace(/^["']|["']$/g, ""),
      category: parsed.category || null
    };
  } catch(e) {
    return { description: raw.replace(/^["']|["']$/g, ""), category: null };
  }
}

function parseVessels(js) {
  try {
    var m = js.match(/vessels\s*=\s*(\[[\s\S]*?\]);/);
    return m ? JSON.parse(m[1]) : [];
  } catch(e) { return []; }
}

function detectColor(js) {
  try {
    var m = js.match(/vessels\s*=\s*(\[[\s\S]*?\]);/);
    if (!m) return null;
    var arr = JSON.parse(m[1]);
    return arr[0] ? arr[0].color : null;
  } catch(e) { return null; }
}

function getNextId(allVessels, color, category) {
  var cp = COLOR_PREFIX[color] || "x";
  var cat = CAT_PREFIX[category] || "x";
  var prefix = cp + "-" + cat + "-";
  var nums = allVessels
    .filter(function(v) { return v.id && v.id.startsWith(prefix); })
    .map(function(v) { return parseInt(v.id.replace(prefix, ""), 10); })
    .filter(function(n) { return !isNaN(n); });
  var next = nums.length ? Math.max.apply(null, nums) + 1 : 1;
  return prefix + next;
}

function AutoBadge(props) {
  return (
    <span style={{
      marginLeft:7, fontSize:8, letterSpacing:"0.1em",
      background: props.sw + "18", color: props.sw,
      border: "1px solid " + props.sw + "88",
      borderRadius:3, padding:"1px 5px",
      textTransform:"uppercase", fontFamily:"DM Mono,monospace",
      verticalAlign:"middle", display:"inline-block"
    }}>auto</span>
  );
}

function downloadSnippet(queue, color) {
  var colorFile = COLOR_FILE_MAP[color] || color.toLowerCase();
  var today = new Date();
  var yy = String(today.getFullYear()).slice(2);
  var mm = String(today.getMonth() + 1).padStart(2, "0");
  var dd = String(today.getDate()).padStart(2, "0");
  var dateStr = yy + mm + dd;

  // Build vessel objects (no _photo)
  var vesselLines = queue.map(function(v) {
    var obj = { id: v.id, color: v.color, category: v.category, name: v.name };
    if (v.diameter !== undefined) obj.diameter = v.diameter;
    if (v.length !== undefined) obj.length = v.length;
    if (v.width !== undefined) obj.width = v.width;
    if (v.height !== undefined) obj.height = v.height;
    if (v.qty !== undefined) obj.qty = v.qty;
    if (v.notes !== undefined) obj.notes = v.notes;
    return "  " + JSON.stringify(obj);
  });

  // Build IMAGES entries (only vessels that have a photo)
  var imageLines = queue
    .filter(function(v) { return v._photo; })
    .map(function(v) {
      return "  " + JSON.stringify(v.id) + ": " + JSON.stringify(v._photo);
    });

  var lines = [
    "// PK Props Vessel Snippet — " + color + " — " + dateStr,
    "// Append NEW_VESSELS into the vessels array in data/" + colorFile + ".js",
    "// Merge NEW_IMAGES into the IMAGES object in data/" + colorFile + ".js",
    "",
    "const NEW_VESSELS = [",
    vesselLines.join(",\n"),
    "];",
    "",
    "const NEW_IMAGES = {",
    imageLines.join(",\n"),
    "};"
  ];

  var content = lines.join("\n");
  var blob = new Blob([content], { type: "text/javascript" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = dateStr + "-" + colorFile + "-snippet.js";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

var lbl = { display:"block", fontSize:9, letterSpacing:"0.12em", textTransform:"uppercase", color:"#6B6860", marginBottom:5, fontFamily:"DM Mono,monospace" };
var inp = { width:"100%", boxSizing:"border-box", fontFamily:"DM Mono,monospace", fontSize:12, padding:"8px 10px", border:"1.5px solid #DEDAD4", borderRadius:4, background:"#F5F2EE", color:"#1A1A18", outline:"none" };
var card = { background:"#fff", borderRadius:10, border:"1px solid #DEDAD4", padding:"20px 22px", marginBottom:14 };

export default function VesselUploader() {
  var [jsFileName, setJsFileName] = useState("");
  var [vessels, setVessels] = useState([]);
  var [color, setColor] = useState("Black");
  var [loaded, setLoaded] = useState(false);
  var [queue, setQueue] = useState([]);
  var [photo, setPhoto] = useState(null);
  var [name, setName] = useState("");
  var [nameAuto, setNameAuto] = useState(false);
  var [describing, setDescribing] = useState(false);
  var [category, setCategory] = useState("Bowls");
  var [catSuggested, setCatSuggested] = useState(false);
  var [diameter, setDiameter] = useState("");
  var [length, setLength] = useState("");
  var [width, setWidth] = useState("");
  var [height, setHeight] = useState("");
  var [qty, setQty] = useState("1");
  var [notes, setNotes] = useState("");
  var [jsDrag, setJsDrag] = useState(false);
  var [photoDrag, setPhotoDrag] = useState(false);
  var [nameErr, setNameErr] = useState(false);
  var [editingId, setEditingId] = useState(null);
  var [editFields, setEditFields] = useState({});
  var [downloaded, setDownloaded] = useState(false);
  var [apiError, setApiError] = useState("");

  var jsFileRef = useRef(null);
  var photoFileRef = useRef(null);

  var sw = COLOR_SWATCHES[color] || "#999";
  var isWhite = color === "White";
  var allV = vessels.concat(queue);
  var nextId = loaded ? getNextId(allV, color, category) : null;
  var canAdd = name.trim().length > 0 && !describing;

  function handleJsFile(file) {
    if (!file || !file.name.endsWith(".js")) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      var text = e.target.result;
      var parsed = parseVessels(text);
      var det = detectColor(text);
      setJsFileName(file.name);
      setVessels(parsed);
      if (det && COLOR_SWATCHES[det]) setColor(det);
      setQueue([]);
      setLoaded(true);
      setDownloaded(false);
    };
    reader.readAsText(file);
  }

  async function handlePhoto(file) {
    if (!file || !file.type.startsWith("image/")) return;
    setPhoto(null);
    setDescribing(true);
    setName("");
    setNameAuto(false);
    setApiError("");
    try {
      var b64 = await compressImage(file);
      setPhoto(b64);
      var result = await autoDescribe(b64);
      setName(result.description);
      setNameAuto(true);
      if (result.category && CATEGORIES.indexOf(result.category) !== -1) {
        setCategory(result.category);
        setCatSuggested(true);
      }
    } catch(e) {
      setName("");
      setApiError("Auto-describe failed: " + e.message + ". You can type a description manually.");
    }
    setDescribing(false);
  }

  function addVessel() {
    if (!name.trim()) {
      setNameErr(true);
      setTimeout(function() { setNameErr(false); }, 1500);
      return;
    }
    var id = getNextId(allV, color, category);
    var v = { id: id, color: color, category: category, name: name.trim(), _photo: photo };
    if (parseFloat(diameter)) v.diameter = parseFloat(diameter);
    if (parseFloat(length)) v.length = parseFloat(length);
    if (parseFloat(width)) v.width = parseFloat(width);
    if (parseFloat(height)) v.height = parseFloat(height);
    if (parseInt(qty) > 1) v.qty = parseInt(qty);
    if (notes.trim()) v.notes = notes.trim();
    setQueue(function(p) { return p.concat([v]); });
    var vNoPhoto = Object.assign({}, v); delete vNoPhoto._photo;
    setVessels(function(p) { return p.concat([vNoPhoto]); });
    setPhoto(null); setName(""); setNameAuto(false);
    setDiameter(""); setLength(""); setWidth(""); setHeight("");
    setQty("1"); setNotes(""); setCatSuggested(false); setApiError("");
    setDownloaded(false);
    if (photoFileRef.current) photoFileRef.current.value = "";
  }

  function removeFromQueue(id) {
    setQueue(function(p) { return p.filter(function(v) { return v.id !== id; }); });
    setVessels(function(p) { return p.filter(function(v) { return v.id !== id; }); });
    if (editingId === id) setEditingId(null);
    setDownloaded(false);
  }

  function startEdit(v) {
    setEditingId(v.id);
    setEditFields({
      name: v.name, category: v.category,
      diameter: v.diameter !== undefined ? String(v.diameter) : "",
      length: v.length !== undefined ? String(v.length) : "",
      width: v.width !== undefined ? String(v.width) : "",
      height: v.height !== undefined ? String(v.height) : "",
      qty: v.qty !== undefined ? String(v.qty) : "1",
      notes: v.notes || ""
    });
  }

  function saveEdit(id) {
    function applyEdit(v) {
      if (v.id !== id) return v;
      var u = Object.assign({}, v, { name: editFields.name.trim() || v.name, category: editFields.category });
      if (parseFloat(editFields.diameter)) u.diameter = parseFloat(editFields.diameter); else delete u.diameter;
      if (parseFloat(editFields.length)) u.length = parseFloat(editFields.length); else delete u.length;
      if (parseFloat(editFields.width)) u.width = parseFloat(editFields.width); else delete u.width;
      if (parseFloat(editFields.height)) u.height = parseFloat(editFields.height); else delete u.height;
      if (parseInt(editFields.qty) > 1) u.qty = parseInt(editFields.qty); else delete u.qty;
      if (editFields.notes.trim()) u.notes = editFields.notes.trim(); else delete u.notes;
      return u;
    }
    setQueue(function(p) { return p.map(applyEdit); });
    setVessels(function(p) { return p.map(applyEdit); });
    setEditingId(null);
    setDownloaded(false);
  }

  var dropZoneStyle = function(drag, active, ok) {
    return { border:"2px " + (active ? "solid" : "dashed") + " " + (drag ? "#1A1A18" : ok ? "#4CAF50" : "#DEDAD4"), borderRadius:8, cursor:"pointer", background: drag ? "#EDE9E3" : ok ? "#F0FBF0" : "#fff", transition:"all 0.15s" };
  };

  return (
    <div style={{ fontFamily:"DM Mono,monospace", background:"#F5F2EE", minHeight:"100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@400&family=DM+Mono:wght@300;400;500&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />

      <div style={{ background:"#1A1A18", color:"#fff", padding:"0 24px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontFamily:"Barlow Semi Condensed,sans-serif", fontSize:19 }}>PhotoKitchen</span>
        <span style={{ fontFamily:"Syne,sans-serif", fontWeight:700, fontSize:12, color:"#888", letterSpacing:"0.12em", textTransform:"uppercase" }}>Vessel Uploader</span>
      </div>

      <div style={{ background:"#D9D4CC", borderTop:"1px solid #C8C2B8", padding:"14px 24px 18px" }}>
        <div style={{ maxWidth:660, margin:"0 auto" }}>
          <div style={{ fontFamily:"Syne,sans-serif", fontWeight:700, fontSize:11, color:"#9A9590", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>How to use</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
            {[
              ["STEP 1","Load Color JS File","Select color, download the JS file from GitHub, drag it in."],
              ["STEP 2","Add Vessel Details","Upload a photo — description and category auto-generate. Fill dims, add to queue. Repeat for each vessel."],
              ["STEP 3","Download Snippet","Click Download Snippet. Bring the snippet file + the color JS to a new Claude chat to merge and get your updated file."]
            ].map(function(s) {
              return (
                <div key={s[0]}>
                  <div style={{ fontFamily:"Syne,sans-serif", fontWeight:700, fontSize:11, color:"#9A9590", letterSpacing:"0.06em", marginBottom:3 }}>{s[0]}</div>
                  <div style={{ fontFamily:"Syne,sans-serif", fontWeight:700, fontSize:11, color:"#4A4640", marginBottom:5 }}>{s[1]}</div>
                  <div style={{ fontSize:10, color:"#6B6860", lineHeight:1.6 }}>{s[2]}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:660, margin:"0 auto", padding:"24px 20px" }}>

        {/* STEP 1 */}
        <div style={card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
              <span style={{ fontFamily:"Syne,sans-serif", fontWeight:700, fontSize:14, color:"#C4C0B8", letterSpacing:"0.06em" }}>STEP 1</span>
              <span style={{ fontFamily:"Syne,sans-serif", fontWeight:700, fontSize:15, color:"#1A1A18" }}>Load Color JS File</span>
            </div>
            {loaded && <span style={{ fontSize:10, color:"#4CAF50", fontFamily:"DM Mono,monospace" }}>{"✓ " + vessels.length + " vessels — " + jsFileName}</span>}
          </div>

          <div style={{ marginBottom:12 }}>
            <label style={lbl}>Select Color Category</label>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <select value={color} onChange={function(e) { setColor(e.target.value); }}
                style={{ flex:1, boxSizing:"border-box", fontFamily:"DM Mono,monospace", fontSize:12, padding:"8px 10px", border:"1.5px solid " + sw, borderRadius:4, background: isWhite ? "#fff" : sw + "18", color: isWhite ? "#999" : sw, cursor:"pointer", outline:"none" }}>
                {Object.keys(COLOR_FILE_MAP).map(function(c) { return <option key={c} value={c}>{c}</option>; })}
              </select>
              <a href={"https://raw.githubusercontent.com/photokitchenfood/pk-vessels-catalog/refs/heads/main/data/" + COLOR_FILE_MAP[color] + ".js"} target="_blank" rel="noreferrer"
                style={{ display:"flex", alignItems:"center", padding:"8px 14px", background:"#1A1A18", color:"#fff", borderRadius:4, fontFamily:"DM Mono,monospace", fontSize:11, textDecoration:"none", whiteSpace:"nowrap", flexShrink:0 }}>
                Get JS File ↗
              </a>
            </div>
            <div style={{ marginTop:6, fontSize:10, color:"#C4C0B8", lineHeight:1.6 }}>
              {"Download " + COLOR_FILE_MAP[color] + ".js then drag it below. If it opens as text in your browser, right-click → Save Link As."}
            </div>
          </div>

          <div
            onDrop={function(e) { e.preventDefault(); setJsDrag(false); handleJsFile(e.dataTransfer.files[0]); }}
            onDragOver={function(e) { e.preventDefault(); setJsDrag(true); }}
            onDragLeave={function() { setJsDrag(false); }}
            onClick={function() { if (jsFileRef.current) jsFileRef.current.click(); }}
            style={Object.assign({}, dropZoneStyle(jsDrag, false, loaded), { padding:"22px 20px", textAlign:"center" })}
          >
            <input ref={jsFileRef} type="file" accept=".js" style={{ display:"none" }}
              onChange={function(e) { if (e.target.files && e.target.files[0]) handleJsFile(e.target.files[0]); }} />
            {loaded
              ? <div style={{ fontSize:12, color:"#4CAF50" }}>
                  <div style={{ fontSize:20, marginBottom:4 }}>✓</div>
                  <strong>{jsFileName}</strong>{" — " + vessels.length + " vessels loaded"}
                  <div style={{ fontSize:10, color:"#6B6860", marginTop:4 }}>Click to load a different file</div>
                </div>
              : <div style={{ color:"#C4C0B8", fontSize:11 }}>
                  <div style={{ fontSize:22, marginBottom:6 }}>📁</div>
                  Click or drag your <strong>data/[color].js</strong> file here
                </div>
            }
          </div>
        </div>

        {/* STEP 2 */}
        {loaded && (
          <div style={card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                <span style={{ fontFamily:"Syne,sans-serif", fontWeight:700, fontSize:14, color:"#C4C0B8", letterSpacing:"0.06em" }}>STEP 2</span>
                <span style={{ fontFamily:"Syne,sans-serif", fontWeight:700, fontSize:15, color:"#1A1A18" }}>Add Vessel Details</span>
              </div>
              {nextId && <span style={{ fontFamily:"DM Mono,monospace", fontSize:11, fontWeight:600, color:"#1A1A18", letterSpacing:"0.06em" }}>{nextId}</span>}
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Photo <span style={{ color:"#C4C0B8", textTransform:"none", letterSpacing:0 }}>(JPEG or PNG)</span></label>
              <div
                onDrop={function(e) { e.preventDefault(); setPhotoDrag(false); if (e.dataTransfer.files[0]) handlePhoto(e.dataTransfer.files[0]); }}
                onDragOver={function(e) { e.preventDefault(); setPhotoDrag(true); }}
                onDragLeave={function() { setPhotoDrag(false); }}
                onClick={function() { if (photoFileRef.current) photoFileRef.current.click(); }}
                style={Object.assign({}, dropZoneStyle(photoDrag, !!photo, false), photo ? { overflow:"hidden" } : { padding:"20px", textAlign:"center" })}
              >
                <input ref={photoFileRef} type="file" accept="image/*" style={{ display:"none" }}
                  onChange={function(e) { if (e.target.files && e.target.files[0]) handlePhoto(e.target.files[0]); }} />
                {describing
                  ? <div style={{ padding:"20px", textAlign:"center", color:"#C4C0B8", fontSize:11 }}>Converting and analyzing image...</div>
                  : photo
                    ? <img src={photo} alt="vessel" style={{ width:"100%", height:"auto", display:"block" }} />
                    : <div style={{ color:"#C4C0B8", fontSize:11 }}>
                        <div style={{ fontSize:22, marginBottom:6 }}>📷</div>
                        Click or drag vessel photo (PNG or JPEG)
                      </div>
                }
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={lbl}>
                Name / Description
                {!describing && nameAuto && <AutoBadge sw={sw} />}
              </label>
              <input type="text"
                value={name}
                onChange={function(e) { setName(e.target.value); setNameAuto(false); }}
                disabled={describing}
                placeholder={describing ? "Generating description..." : "e.g. Round Bowl, Matte Black, Wide Rim, Shallow"}
                style={Object.assign({}, inp, { borderColor: nameErr ? "#D94040" : nameAuto ? sw : "#DEDAD4", color: describing ? "#C4C0B8" : "#1A1A18" })}
              />
              {apiError && <div style={{ marginTop:6, fontSize:10, color:"#D94040", lineHeight:1.5 }}>{apiError}</div>}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
              <div>
                <label style={lbl}>Color <span style={{ color:"#C4C0B8" }}>(locked)</span></label>
                <div style={Object.assign({}, inp, { border:"1.5px solid " + sw, background: isWhite ? "#fff" : sw + "18", color: isWhite ? "#999" : sw, display:"flex", alignItems:"center", gap:7, cursor:"default", userSelect:"none" })}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:sw, border:"1px solid rgba(0,0,0,0.1)", flexShrink:0, display:"inline-block" }} />
                  {color}
                </div>
              </div>
              <div>
                <label style={lbl}>Category {catSuggested && <AutoBadge sw={sw} />}</label>
                <select value={category} onChange={function(e) { setCategory(e.target.value); setCatSuggested(false); }}
                  style={Object.assign({}, inp, { cursor:"pointer", borderColor: catSuggested ? sw : "#DEDAD4" })}>
                  {CATEGORIES.map(function(o) { return <option key={o} value={o}>{o}</option>; })}
                </select>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:14 }}>
              {[["D (cm)", diameter, setDiameter],["L (cm)", length, setLength],["W (cm)", width, setWidth],["H (cm)", height, setHeight]].map(function(item) {
                return (
                  <div key={item[0]}>
                    <label style={lbl}>{item[0]}</label>
                    <input type="number" value={item[1]} onChange={function(e) { item[2](e.target.value); }}
                      placeholder="--" step="0.5" min="0"
                      style={Object.assign({}, inp, { textAlign:"center", padding:"8px 4px" })} />
                  </div>
                );
              })}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"72px 1fr", gap:10, marginBottom:18 }}>
              <div>
                <label style={lbl}>Qty</label>
                <input type="number" value={qty} onChange={function(e) { setQty(e.target.value); }} min="1"
                  style={Object.assign({}, inp, { textAlign:"center", padding:"8px 4px" })} />
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <input type="text" value={notes} onChange={function(e) { setNotes(e.target.value); }} placeholder="Optional" style={inp} />
              </div>
            </div>

            <button onClick={addVessel} disabled={!canAdd}
              style={{ width:"100%", padding:"10px", background: canAdd ? "#1A1A18" : "#C4C0B8", color:"#fff", border:"none", borderRadius:4, fontFamily:"DM Mono,monospace", fontSize:12, cursor: canAdd ? "pointer" : "not-allowed", letterSpacing:"0.04em" }}>
              + Add to Queue
            </button>
          </div>
        )}

        {/* STEP 3 */}
        {queue.length > 0 && (
          <div style={card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                <span style={{ fontFamily:"Syne,sans-serif", fontWeight:700, fontSize:14, color:"#C4C0B8", letterSpacing:"0.06em" }}>STEP 3</span>
                <span style={{ fontFamily:"Syne,sans-serif", fontWeight:700, fontSize:15, color:"#1A1A18" }}>Review &amp; Download</span>
              </div>
              <span style={{ fontSize:10, color:"#4CAF50", fontFamily:"DM Mono,monospace" }}>{queue.length + " vessel" + (queue.length !== 1 ? "s" : "") + " ready"}</span>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:18 }}>
              {queue.map(function(v) {
                return (
                  <div key={v.id}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"#F5F2EE", borderRadius: editingId === v.id ? "6px 6px 0 0" : 6, border:"1px solid #DEDAD4" }}>
                      {v._photo
                        ? <img src={v._photo} alt="" style={{ width:40, height:40, objectFit:"cover", borderRadius:4, flexShrink:0 }} />
                        : <div style={{ width:40, height:40, background:"#DEDAD4", borderRadius:4, flexShrink:0 }} />
                      }
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:"Syne,sans-serif", fontSize:12, fontWeight:600, color:"#1A1A18", marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v.name}</div>
                        <div style={{ fontSize:10, color:"#6B6860" }}>{v.id + " · " + v.category + (v.diameter ? " · D:" + v.diameter + "cm" : "") + (v.height ? " · H:" + v.height + "cm" : "")}</div>
                      </div>
                      <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                        <button onClick={function() { if (editingId === v.id) setEditingId(null); else startEdit(v); }}
                          style={{ background:"none", border:"1px solid #DEDAD4", borderRadius:3, cursor:"pointer", color:"#6B6860", fontSize:10, fontFamily:"DM Mono,monospace", padding:"2px 8px" }}>
                          {editingId === v.id ? "cancel" : "edit"}
                        </button>
                        <button onClick={function() { removeFromQueue(v.id); }}
                          style={{ background:"none", border:"none", cursor:"pointer", color:"#C4C0B8", fontSize:18, lineHeight:1, padding:"0 2px" }}>×</button>
                      </div>
                    </div>

                    {editingId === v.id && (
                      <div style={{ background:"#F5F2EE", border:"1px solid #DEDAD4", borderTop:"1px solid #E8E4DE", borderRadius:"0 0 6px 6px", padding:"12px 12px 14px" }}>
                        <div style={{ marginBottom:10 }}>
                          <label style={lbl}>Name</label>
                          <input type="text" value={editFields.name} onChange={function(e) { var val = e.target.value; setEditFields(function(p) { return Object.assign({},p,{name:val}); }); }}
                            style={Object.assign({}, inp, { background:"#fff" })} />
                        </div>
                        <div style={{ marginBottom:10 }}>
                          <label style={lbl}>Category</label>
                          <select value={editFields.category} onChange={function(e) { var val = e.target.value; setEditFields(function(p) { return Object.assign({},p,{category:val}); }); }}
                            style={Object.assign({}, inp, { background:"#fff", cursor:"pointer" })}>
                            {CATEGORIES.map(function(o) { return <option key={o} value={o}>{o}</option>; })}
                          </select>
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:10 }}>
                          {[["D","diameter"],["L","length"],["W","width"],["H","height"]].map(function(pair) {
                            return (
                              <div key={pair[0]}>
                                <label style={lbl}>{pair[0]} cm</label>
                                <input type="number" value={editFields[pair[1]]} step="0.5" min="0" placeholder="--"
                                  onChange={function(e) { var val = e.target.value, key = pair[1]; setEditFields(function(p) { var u = Object.assign({},p); u[key]=val; return u; }); }}
                                  style={Object.assign({}, inp, { background:"#fff", textAlign:"center", padding:"7px 4px" })} />
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"72px 1fr", gap:8, marginBottom:12 }}>
                          <div>
                            <label style={lbl}>Qty</label>
                            <input type="number" value={editFields.qty} min="1"
                              onChange={function(e) { var val = e.target.value; setEditFields(function(p) { return Object.assign({},p,{qty:val}); }); }}
                              style={Object.assign({}, inp, { background:"#fff", textAlign:"center", padding:"7px 4px" })} />
                          </div>
                          <div>
                            <label style={lbl}>Notes</label>
                            <input type="text" value={editFields.notes} placeholder="Optional"
                              onChange={function(e) { var val = e.target.value; setEditFields(function(p) { return Object.assign({},p,{notes:val}); }); }}
                              style={Object.assign({}, inp, { background:"#fff" })} />
                          </div>
                        </div>
                        <button onClick={function() { saveEdit(v.id); }}
                          style={{ width:"100%", padding:"8px", background:"#1A1A18", color:"#fff", border:"none", borderRadius:4, fontFamily:"DM Mono,monospace", fontSize:11, cursor:"pointer" }}>
                          Save changes
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={function() {
                downloadSnippet(queue, color);
                setDownloaded(true);
              }}
              style={{ width:"100%", padding:"11px", background:"#1A1A18", color:"#fff", border:"none", borderRadius:4, fontFamily:"DM Mono,monospace", fontSize:12, cursor:"pointer", letterSpacing:"0.04em", marginBottom:10 }}>
              ↓ Download Snippet
            </button>

            {downloaded && (
              <div style={{ background:"#F0FBF0", border:"1px solid #4CAF5055", borderRadius:6, padding:"12px 14px", fontSize:10, color:"#2E7D32", lineHeight:1.7, fontFamily:"DM Mono,monospace" }}>
                <strong style={{ display:"block", marginBottom:4 }}>Snippet downloaded!</strong>
                Bring the snippet file + your <strong>{COLOR_FILE_MAP[color]}.js</strong> to a new Claude chat and say:<br />
                <em style={{ color:"#4A4640" }}>"Merge this snippet into the color JS file and give me the updated file."</em>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
