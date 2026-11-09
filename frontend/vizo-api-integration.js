/* VIZO API integration. Original root HTML prototype is not modified. */
(function () {
  "use strict";
  var TOKEN = "vizo-api-token", BASE = "vizo-api-base";
  var base = (localStorage.getItem(BASE) || window.VIZO_API_BASE ||
    ((location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.protocol === "file:") ? "http://localhost:3000" : location.origin)).replace(/\/+$/, "");
  var apiUser = null;
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function getToken() { return localStorage.getItem(TOKEN) || ""; }
  function setToken(v) { if (v) localStorage.setItem(TOKEN, v); else localStorage.removeItem(TOKEN); }
  async function request(path, options) {
    options = options || {};
    var headers = Object.assign({"Content-Type":"application/json"}, options.headers || {});
    if (getToken()) headers.Authorization = "Bearer " + getToken();
    var response;
    try { response = await fetch(base + path, Object.assign({}, options, {headers:headers})); }
    catch (e) { throw new Error("Нет связи с VIZO API " + base + ". Запустите backend и проверьте CORS. " + (e.message || "")); }
    var raw = response.status === 204 ? "" : await response.text(), data = null;
    if (raw) { try { data = JSON.parse(raw); } catch (_) { data = {message:raw}; } }
    if (!response.ok) throw new Error((data && data.error && data.error.message) || (data && data.message) || ("HTTP " + response.status));
    return data;
  }
  function setUser(user, next) {
    apiUser = user;
    var r = user.role === "seller" ? "seller" : user.role === "admin" ? "admin" : "buyer";
    USER = {email:user.email, name:user.displayName || user.name || user.email, role:r};
    role = r;
    try { localStorage.setItem("vizo-session", JSON.stringify({email:USER.email,name:USER.name,role:r,exp:Date.now()+30*864e5})); } catch (_) {}
    loadUserData();
    if (typeof next === "function") next();
    else go(r === "seller" ? "seller" : r === "admin" ? "admin" : "catalog");
    nav();
  }
  window.authSubmit = async function (e, mode) {
    e.preventDefault();
    var f = new FormData(e.target), email = String(f.get("email") || "").trim().toLowerCase();
    var password = String(f.get("pw") || ""), button = e.target.querySelector('button[type="submit"]');
    var error = document.getElementById("authErr"), sellerSignup = authRole === "seller";
    if (error) error.textContent = "";
    if (button) button.disabled = true;
    try {
      var result;
      if (mode === "up") {
        var name = String(f.get("name") || "").trim();
        if (password.length < 12) throw new Error("Пароль должен содержать минимум 12 символов.");
        if (password !== f.get("pw2")) throw new Error("Пароли не совпадают.");
        result = await request("/api/auth/register", {method:"POST",body:JSON.stringify({email:email,password:password,displayName:name,locale:"ru"})});
      } else {
        result = await request("/api/auth/login", {method:"POST",body:JSON.stringify({email:email,password:password})});
      }
      setToken(result.token);
      setUser(result.user, mode === "up" && sellerSignup ? function () { go("seller-apply"); } : authNext);
      if (mode === "up" && sellerSignup) toast("Аккаунт создан. Отправьте заявку продавца на проверку.");
      if (mode !== "up" && result.user.role === "customer" && sellerSignup) go("seller-apply");
    } catch (err) { if (error) error.textContent = err.message; }
    finally { if (button) button.disabled = false; }
  };
  var oldAuthModal = authModal;
  window.authModal = function (next, mode, r) {
    oldAuthModal(next, mode, r);
    var pw = document.getElementById("a_pw");
    if (pw && mode === "up") pw.minLength = 12;
    var note = document.querySelector("#authErr");
    if (note && note.parentElement && note.parentElement.nextElementSibling && mode === "up")
      note.parentElement.nextElementSibling.textContent = "Серверный аккаунт: пароль минимум 12 символов. Для продавца сначала создаётся аккаунт покупателя, затем отправляется заявка на одобрение.";
  };
  window.switchRole = function (r) {
    if (r !== "seller") { if (!getToken()) return authModal(function(){go("catalog");},"in","buyer"); role="buyer"; return go("catalog"); }
    if (!getToken()) return authModal(function(){switchRole("seller");},"in","buyer");
    if (apiUser && apiUser.role === "seller") { role="seller"; go("seller"); }
    else { role="buyer"; go("seller-apply"); }
  };
  var oldNav = nav;
  window.nav = function () {
    oldNav();
    var n = document.getElementById("nav");
    if (!n) return;
    if (apiUser && apiUser.role === "admin") n.insertAdjacentHTML("beforeend", '<button onclick="go(\'admin\')">Проверка продавцов</button>');
    else if (!apiUser || apiUser.role !== "seller") n.insertAdjacentHTML("beforeend", '<button onclick="go(\'seller-apply\')">Стать продавцом</button>');
    n.insertAdjacentHTML("beforeend", '<button type="button" onclick="vizoConfigureApi()">API URL</button>');
  };
  screens.sellerApply = function () {
    return heading("Заявка продавца","Доступ к кабинету продавца открывается только после одобрения администратора.") +
      '<div class="panel" style="max-width:760px"><div id="sellerApplicationStatus" class="notice">Проверяем заявки…</div>' +
      '<form onsubmit="submitSellerApplication(event)" style="display:grid;gap:12px;margin-top:18px">' +
      '<div class="field"><label class="field-label">Название магазина *</label><input class="input" name="storeName" required minlength="2" maxlength="120"></div>' +
      '<div class="field"><label class="field-label">Юридическое имя</label><input class="input" name="legalName" maxlength="160"></div>' +
      '<div class="field"><label class="field-label">БИН / бизнес-ID</label><input class="input" name="businessId" maxlength="32"></div>' +
      '<div class="field"><label class="field-label">Телефон *</label><input class="input" name="contactPhone" required minlength="7" maxlength="32"></div>' +
      '<div class="field"><label class="field-label">Описание магазина и товаров (минимум 30 символов) *</label><textarea class="input" name="description" required minlength="30" maxlength="3000" rows="4"></textarea></div>' +
      '<div class="field"><label class="field-label">Резюме / опыт (минимум 50 символов)</label><textarea class="input" name="resumeSummary" minlength="50" maxlength="5000" rows="4"></textarea></div>' +
      '<div class="field"><label class="field-label">Или HTTPS-ссылка на резюме</label><input class="input" name="resumeUrl" type="url" placeholder="https://…"></div>' +
      '<div class="field"><label class="field-label">Портфолио (необязательно)</label><input class="input" name="portfolioUrl" type="url" placeholder="https://…"></div>' +
      '<p id="sellerApplicationError" role="alert" style="color:var(--red)"></p><button class="btn primary" type="submit">Отправить заявку на проверку</button></form></div>';
  };
  window.submitSellerApplication = async function (e) {
    e.preventDefault(); var form=e.target, data=Object.fromEntries(new FormData(form).entries());
    Object.keys(data).forEach(function(k){if(data[k]==="")delete data[k];});
    var err=document.getElementById("sellerApplicationError"), btn=form.querySelector('button[type="submit"]');
    if(btn)btn.disabled=true;
    try { await request("/api/seller-applications",{method:"POST",body:JSON.stringify(data)}); if(err)err.textContent=""; toast("Заявка отправлена. Дождитесь решения администратора."); await loadApplicationStatus(); form.reset(); }
    catch(ex){if(err)err.textContent=ex.message;} finally{if(btn)btn.disabled=false;}
  };
  async function loadApplicationStatus() {
    var el=document.getElementById("sellerApplicationStatus"); if(!el)return;
    try { var r=await request("/api/seller-applications/me");
      if(!r.applications.length){el.textContent="Заявок пока нет. Заполните форму ниже.";return;}
      el.innerHTML="<strong>Ваши заявки</strong><ul style=\"margin:10px 0 0 18px\">"+r.applications.map(function(a){return "<li>"+esc(a.store_name)+" — <strong>"+esc(a.status)+"</strong>"+(a.review_note?" · "+esc(a.review_note):"")+"</li>";}).join("")+"</ul>";
    } catch(e){el.textContent=e.message;}
  }
  screens.admin = function () { return heading("Проверка продавцов","Проверяйте заявки и вручную одобряйте или отклоняйте доступ.") +
    '<div class="panel"><div class="stbar"><strong>Ожидают проверки</strong><button class="btn" onclick="loadAdminApplications()">Обновить</button></div><div id="adminApplications" class="notice">Загружаем…</div></div>'; };
  window.loadAdminApplications = async function () {
    var root=document.getElementById("adminApplications");if(!root)return;root.textContent="Загружаем…";
    try { var r=await request("/api/admin/seller-applications?status=pending&limit=50&offset=0");
      if(!r.applications.length){root.textContent="Новых заявок нет.";return;}
      root.innerHTML=r.applications.map(function(a){return '<article class="panel" style="margin:14px 0;padding:18px"><h3>'+esc(a.store_name)+'</h3><p class="notice">'+esc(a.display_name)+' · '+esc(a.email)+' · '+new Date(a.created_at).toLocaleString("ru-RU")+'</p><p style="margin:10px 0">'+esc(a.description)+'</p><p class="notice">Телефон: '+esc(a.contact_phone)+' · БИН: '+esc(a.business_id||"—")+'</p>'+(a.resume_summary?'<p>Резюме: '+esc(a.resume_summary)+'</p>':"")+(a.resume_url?'<p><a href="'+esc(a.resume_url)+'" target="_blank" rel="noopener noreferrer">Открыть резюме</a></p>':"")+(a.portfolio_url?'<p><a href="'+esc(a.portfolio_url)+'" target="_blank" rel="noopener noreferrer">Портфолио</a></p>':"")+'<label class="field-label">Комментарий</label><input class="input" id="review-'+esc(a.id)+'" maxlength="2000" placeholder="Необязательно"><div class="seg" style="margin-top:12px"><button class="btn primary" onclick="reviewSellerApplication(\''+esc(a.id)+'\',\'approved\')">Одобрить</button><button class="btn" onclick="reviewSellerApplication(\''+esc(a.id)+'\',\'rejected\')">Отклонить</button></div></article>';}).join("");
    } catch(e){root.textContent=e.message;}
  };
  window.reviewSellerApplication = async function (id, decision) {
    var note=document.getElementById("review-"+id);try{await request("/api/admin/seller-applications/"+encodeURIComponent(id)+"/review",{method:"POST",body:JSON.stringify({decision:decision,note:note?note.value:""})});toast(decision==="approved"?"Продавец одобрен.":"Заявка отклонена.");await loadAdminApplications();}catch(e){toast(e.message);}
  };
  screens.measure = function () {
    var dims=[["chest","Грудь",96],["waist","Талия",80],["hips","Бёдра",98],["shoulders","Плечи",42],["sleeveLength","Длина рукава",62],["torsoLength","Длина изделия",68]];
    function group(prefix,title){return '<div class="panel" style="min-width:260px;flex:1"><h3>'+title+'</h3>'+dims.map(function(d){return '<div class="field" style="margin-top:10px"><label class="field-label">'+d[1]+', см</label><input class="input" id="'+prefix+'-'+d[0]+'" type="number" min="1" max="250" step="0.1" value="'+d[2]+'"></div>';}).join("")+'</div>';}
    return heading("Анализ посадки","Сравнение мерок тела и одежды с учётом предельной растяжимости ткани.")+'<div style="display:flex;gap:14px;flex-wrap:wrap">'+group("body","Мерки тела")+group("garment","Мерки одежды")+'</div><div class="panel" style="margin-top:14px;max-width:640px"><h3>Характеристики ткани</h3><div class="field"><label class="field-label">Растяжимость по горизонтали, %</label><input class="input" id="stretchH" type="number" min="0" max="100" value="15"></div><div class="field"><label class="field-label">Растяжимость по вертикали, %</label><input class="input" id="stretchV" type="number" min="0" max="100" value="5"></div><button class="btn primary" style="margin-top:14px" onclick="runVizoFitAnalysis()">Рассчитать посадку</button><div id="fitAnalysisResult" style="margin-top:16px" aria-live="polite"></div><p class="notice" style="margin-top:12px">Это расчёт по введённым меркам. Автоматическое извлечение размеров из GLB и физическая симуляция ткани пока не подключены.</p></div>';
  };
  window.runVizoFitAnalysis = async function () {
    var keys=["chest","waist","hips","shoulders","sleeveLength","torsoLength"];
    function read(prefix){var o={};keys.forEach(function(k){o[k]=Number(document.getElementById(prefix+"-"+k).value);});return o;}
    var el=document.getElementById("fitAnalysisResult");
    var payload={body:read("body"),garment:read("garment"),stretch:{horizontalPct:Number(document.getElementById("stretchH").value),verticalPct:Number(document.getElementById("stretchV").value)}};
    el.textContent="Рассчитываем…";
    try {var r=await request("/api/try-on/fit-analysis",{method:"POST",body:JSON.stringify(payload)}),f=r.fit;
      var labels={good:"Подходит",loose:"Свободно",oversized:"Оверсайз",stretching:"Растягивается в пределах материала",too_small:"Слишком мало"};
      el.innerHTML="<h3>"+esc(labels[f.overall]||f.overall)+"</h3><p>"+esc(f.message)+"</p><div style=\"overflow-x:auto\"><table class=\"seller-table\"><thead><tr><th>Параметр</th><th>Тело</th><th>Одежда</th><th>Результат</th><th>Минимум</th></tr></thead><tbody>"+f.checks.map(function(x){return "<tr><td>"+esc(x.label)+"</td><td>"+x.bodyCm+" см</td><td>"+x.garmentCm+" см</td><td>"+esc(labels[x.status]||x.status)+"</td><td>"+(x.recommendedMinimumCm==null?"—":x.recommendedMinimumCm+" см")+"</td></tr>";}).join("")+"</tbody></table></div>";
    }catch(e){el.textContent=e.message;}
  };
  var oldGo=go;
  window.go = function (page) {
    if (page==="seller-apply" || page==="admin" || page==="measure") {
      if(!getToken())return authModal(function(){go(page);},"in","buyer");
      if(page==="admin" && (!apiUser || apiUser.role!=="admin")){toast("Доступ только для администратора.");return;}
      if(page==="seller-apply" && apiUser && apiUser.role==="seller")return oldGo("seller");
      view=page;role="buyer";clearTimeout(runTimer);nav();
      var names={"seller-apply":"Заявка продавца",admin:"Администрирование",measure:"Анализ посадки"};
      document.getElementById("crumb").textContent=names[page];
      document.getElementById("content").innerHTML='<section class="screen" id="screen">'+screens[page]()+'</section>';
      window.scrollTo({top:0,behavior:"instant"});
      if(page==="seller-apply")loadApplicationStatus();if(page==="admin")loadAdminApplications();return;
    }
    return oldGo(page);
  };
  var oldLogout=logout;
  window.logout = async function () { try{if(getToken())await request("/api/auth/logout",{method:"POST",body:"{}"});}catch(_){}setToken("");apiUser=null;oldLogout(); };
  var oldHow=screens.how;
  screens.how=function(){return oldHow()+'<div class="panel" style="margin-top:14px"><h3>Проверка размерной посадки</h3><p class="notice">Серверный анализ мерок и растяжимости ткани.</p><button class="btn primary" onclick="go(\'measure\')">Открыть анализ посадки</button></div>';};
  USER=null;try{localStorage.removeItem("vizo-session");}catch(_){}loadUserData();nav();
  if(getToken())request("/api/auth/me").then(function(r){setUser(r.user,function(){go("catalog");});}).catch(function(){setToken("");apiUser=null;USER=null;nav();});
  window.vizoSetApiBase=function(value){var v=String(value||"").trim().replace(/\/+$/,"");if(!/^https?:\/\/[^ ]+$/i.test(v))throw new Error("Укажите полный http(s) URL API.");base=v;localStorage.setItem(BASE,v);toast("API URL сохранён: "+base);return base;};
  window.vizoConfigureApi=function(){var v=prompt("URL VIZO API",base);if(v!==null){try{window.vizoSetApiBase(v);}catch(e){toast(e.message);}}};
  window.vizoApiInfo=function(){return {baseUrl:base,authenticated:!!getToken(),role:apiUser&&apiUser.role||null};};
})();