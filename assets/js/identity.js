/**
 * Lightweight per-browser identity. No login — just a stable random id
 * + an editable display name kept in localStorage.
 */
window.WongnaiiIdentity = (function () {
  const ID_KEY = "wongnaii:id";
  const NAME_KEY = "wongnaii:name";

  function uuid() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return "u-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function getId() {
    let id = localStorage.getItem(ID_KEY);
    if (!id) { id = uuid(); localStorage.setItem(ID_KEY, id); }
    return id;
  }

  function getName() {
    return localStorage.getItem(NAME_KEY) || "";
  }
  function setName(name) {
    localStorage.setItem(NAME_KEY, name);
  }

  function getOrPromptName(prompt = "ใส่ชื่อของคุณ") {
    let name = getName();
    if (!name) {
      name = window.prompt(prompt, "");
      if (name) setName(name);
    }
    return name;
  }

  return { getId, getName, setName, getOrPromptName };
})();
