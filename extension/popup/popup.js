// Popup ロジック
// セキュリティモデル:
//   chrome.storage.local  → AES-256-GCM 暗号化済みデータ（永続・ディスク保存）
//   chrome.storage.session → パスワード（メモリのみ・Chrome終了で自動消去）
//   Bitwarden と同じ方式: Chrome 起動ごとに1回だけ入力すればよい
(() => {
  const STORAGE_KEY   = 'shukatsu_autofill_v1';
  const SESSION_KEY   = 'shukatsu_session_pw';

  let currentPassword = null;

  const screens = {
    setup: document.getElementById('screen-setup'),
    lock:  document.getElementById('screen-lock'),
    main:  document.getElementById('screen-main'),
  };

  function showScreen(name) {
    Object.values(screens).forEach(s => { s.style.display = 'none'; });
    screens[name].style.display = 'block';
  }

  function showStatus(id, msg, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className = `status ${type}`;
    if (type !== 'error') setTimeout(() => { el.className = 'status'; el.textContent = ''; }, 3000);
  }

  // ===== ストレージ =====
  async function loadEncrypted() {
    return new Promise(resolve => {
      chrome.storage.local.get(STORAGE_KEY, r => resolve(r[STORAGE_KEY] || null));
    });
  }

  async function saveEncrypted(profile, password) {
    const payload = await Crypto.encrypt(profile, password);
    return new Promise(resolve => chrome.storage.local.set({ [STORAGE_KEY]: payload }, resolve));
  }

  // セッションにパスワードを保存（Chrome終了で自動消去）
  async function saveSession(password) {
    return new Promise(resolve => chrome.storage.session.set({ [SESSION_KEY]: password }, resolve));
  }

  async function loadSession() {
    return new Promise(resolve => {
      chrome.storage.session.get(SESSION_KEY, r => resolve(r[SESSION_KEY] || null));
    });
  }

  async function clearSession() {
    return new Promise(resolve => chrome.storage.session.remove(SESSION_KEY, resolve));
  }

  // ===== 解錠処理（共通） =====
  async function unlock(password) {
    const payload = await loadEncrypted();
    if (!payload) return null;
    const profile = await Crypto.decrypt(payload, password); // 失敗時は例外
    currentPassword = password;
    await saveSession(password); // Chrome セッションに保存
    profileToForm(profile);
    showScreen('main');
    return profile;
  }

  // ===== プロフィール → フォーム =====
  function profileToForm(profile) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el && val !== undefined && val !== null) el.value = val;
    };
    set('p-lastName',       profile.name?.lastName);
    set('p-firstName',      profile.name?.firstName);
    set('p-lastNameKana',   profile.name?.lastNameKana);
    set('p-firstNameKana',  profile.name?.firstNameKana);
    set('p-birthdate',      profile.birthdate);
    set('p-email',          profile.email);
    set('p-phone',          profile.phone);
    set('p-mobile',         profile.mobile);
    set('p-postalCode',     profile.address?.postalCode);
    set('p-prefecture',     profile.address?.prefecture);
    set('p-city',           profile.address?.city);
    set('p-street',         profile.address?.street);
    set('p-apartment',      profile.address?.apartment);
    set('p-hs-prefecture',       profile.highSchool?.prefecture);
    set('p-hs-name',             profile.highSchool?.name);
    set('p-hs-enroll-year',      profile.highSchool?.enrollYear);
    set('p-hs-enroll-month',     profile.highSchool?.enrollMonth);
    set('p-hs-graduate-year',    profile.highSchool?.graduateYear);
    set('p-hs-graduate-month',   profile.highSchool?.graduateMonth);
    set('p-undergrad-name',           profile.undergrad?.name);
    set('p-undergrad-graduate-year',  profile.undergrad?.graduateYear);
    set('p-undergrad-graduate-month', profile.undergrad?.graduateMonth);
    set('p-school-type',    profile.education?.type);
    set('p-national-type',  profile.education?.nationalType);
    set('p-school-name',    profile.education?.name);
    set('p-first-char',     profile.education?.firstChar);
    set('p-school-pref',    profile.education?.prefecture);
    set('p-faculty',        profile.education?.faculty);
    set('p-department',     profile.education?.department);
    set('p-enroll-year',    profile.education?.enrollYear);
    set('p-enroll-month',   profile.education?.enrollMonth);
    set('p-graduate-year',  profile.education?.graduateYear);
    set('p-graduate-month', profile.education?.graduateMonth);
    const sameAddr = document.getElementById('p-same-address');
    if (sameAddr) sameAddr.checked = profile.checkSameAddress !== false;
    set('p-gender',          profile.gender);
    set('p-education-level', profile.educationLevel);
    set('p-graduated-hs',    profile.graduatedHighSchool);
    set('p-study-abroad',    profile.studyAbroad);
    set('p-seminar-name',    profile.seminarName);
    set('p-seminar-content', profile.seminarContent);
    set('p-club-activity',   profile.clubActivity);
    const howKnownVals = Array.isArray(profile.howKnown) ? profile.howKnown : (profile.howKnown ? [profile.howKnown] : []);
    document.querySelectorAll('input[name="p-how-known"]').forEach(cb => {
      cb.checked = howKnownVals.some(v => cb.value === v || cb.value.includes(v) || v.includes(cb.value));
    });
    const industryVals = Array.isArray(profile.interestedIndustries) ? profile.interestedIndustries : [];
    document.querySelectorAll('input[name="p-interested-industries"]').forEach(cb => {
      cb.checked = industryVals.some(v => cb.value === v || cb.value.includes(v) || v.includes(cb.value));
    });
    const studyAbroadTypeVals = Array.isArray(profile.studyAbroadType) ? profile.studyAbroadType : [];
    document.querySelectorAll('input[name="p-study-abroad-type"]').forEach(cb => {
      cb.checked = studyAbroadTypeVals.some(v => cb.value === v || cb.value.includes(v) || v.includes(cb.value));
    });
  }

  // ===== フォーム → プロフィール =====
  function formToProfile() {
    const get    = id => document.getElementById(id)?.value?.trim() || '';
    const getNum = id => { const v = get(id); return v ? parseInt(v, 10) : undefined; };
    return {
      name: {
        lastName:      get('p-lastName'),
        firstName:     get('p-firstName'),
        lastNameKana:  get('p-lastNameKana'),
        firstNameKana: get('p-firstNameKana'),
      },
      birthdate: get('p-birthdate'),
      email:     get('p-email'),
      phone:     get('p-phone'),
      mobile:    get('p-mobile'),
      address: {
        postalCode: get('p-postalCode'),
        prefecture: get('p-prefecture'),
        city:       get('p-city'),
        street:     get('p-street'),
        apartment:  get('p-apartment'),
      },
      highSchool: {
        prefecture:    get('p-hs-prefecture'),
        name:          get('p-hs-name'),
        enrollYear:    getNum('p-hs-enroll-year'),
        enrollMonth:   getNum('p-hs-enroll-month'),
        graduateYear:  getNum('p-hs-graduate-year'),
        graduateMonth: getNum('p-hs-graduate-month'),
      },
      undergrad: {
        name:          get('p-undergrad-name'),
        graduateYear:  getNum('p-undergrad-graduate-year'),
        graduateMonth: getNum('p-undergrad-graduate-month'),
      },
      checkSameAddress: document.getElementById('p-same-address')?.checked ?? true,
      gender:              get('p-gender'),
      educationLevel:      get('p-education-level'),
      graduatedHighSchool: get('p-graduated-hs'),
      studyAbroad:         get('p-study-abroad'),
      seminarName:         get('p-seminar-name'),
      seminarContent:      get('p-seminar-content'),
      clubActivity:        get('p-club-activity'),
      howKnown:            Array.from(document.querySelectorAll('input[name="p-how-known"]:checked')).map(cb => cb.value),
      interestedIndustries: Array.from(document.querySelectorAll('input[name="p-interested-industries"]:checked')).map(cb => cb.value),
      studyAbroadType: Array.from(document.querySelectorAll('input[name="p-study-abroad-type"]:checked')).map(cb => cb.value),
      education: {
        type:          get('p-school-type'),
        nationalType:  get('p-national-type'),
        name:          get('p-school-name'),
        firstChar:     get('p-first-char'),
        prefecture:    get('p-school-pref'),
        faculty:       get('p-faculty'),
        department:    get('p-department'),
        enrollYear:    getNum('p-enroll-year'),
        enrollMonth:   getNum('p-enroll-month'),
        graduateYear:  getNum('p-graduate-year'),
        graduateMonth: getNum('p-graduate-month'),
      }
    };
  }

  // ===== 自動入力ボタン =====
  document.getElementById('btn-fill').addEventListener('click', async () => {
    const profile = formToProfile();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) { showStatus('fill-status', 'タブが見つかりませんでした', 'error'); return; }

    try {
      // 未注入の場合のみ注入（2回押し対策）
      const [loaded] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => typeof FieldMatcher !== 'undefined',
      });
      if (!loaded.result) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [
            'content/converters.js',
            'content/field-matcher.js',
            'content/form-filler.js',
            'sites/iweb.js',
          ],
        });
      }

      // フォーム入力を実行
      const [execResult] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (profile) => {
          try {
            const hostname = location.hostname;
            const isIWeb = hostname.endsWith('.i-webs.jp') || hostname.endsWith('.i-web.jpn.com');
            const isAxol = hostname === 'job.axol.jp';

            // i-web 学校選択ページ
            if (isIWeb && typeof IWebSchool !== 'undefined' && IWebSchool.isSchoolSelectPage()) {
              return { success: true, filledCount: IWebSchool.fillSchoolSelect(profile) };
            }

            // axol: 住所フォームを国内モードに切り替え
            if (isAxol) {
              document.querySelectorAll('input[name="kaigaig"], input[name="kaigaik"]').forEach(cb => { cb.checked = false; });
              document.querySelectorAll('[class*="jsJusho"][class*="Japan"]').forEach(el => { el.style.display = ''; });
              document.querySelectorAll('[class*="jsJusho"][class*="Kaigai"]').forEach(el => { el.style.display = 'none'; });
              document.querySelectorAll('select[name="keng"], select[name="kenk"]').forEach(el => { el.removeAttribute('disabled'); });
            }

            const fieldMap = FieldMatcher.detectFields(document);
            let filledCount = FormFiller.fillAll(fieldMap, profile);

            // 「現住所と同じ」チェックボックス
            if (profile.checkSameAddress) {
              const checkboxes = FieldMatcher.findSameAddressCheckboxes(document);
              for (const cb of checkboxes) {
                if (!cb.checked) {
                  const jqA = cb.closest('.jqTransformCheckboxWrapper')?.querySelector('a.jqTransformCheckbox');
                  if (jqA) jqA.click();
                  else { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
                  filledCount++;
                }
              }
            }

            const edu = profile.education || {};
            return {
              success: true,
              filledCount,
              educationHint: {
                type: edu.type || '', name: edu.name || '', firstChar: edu.firstChar || '',
                pref: edu.prefecture || '', faculty: edu.faculty || '', dept: edu.department || '',
              },
            };
          } catch (e) {
            return { success: false, error: e.message };
          }
        },
        args: [profile],
      });

      const response = execResult.result;
      if (response?.success) {
        showStatus('fill-status', `${response.filledCount} 項目を入力しました`, 'success');
        const hint = response.educationHint;
        if (hint && (hint.name || hint.type)) {
          document.getElementById('hint-type').textContent       = hint.type;
          document.getElementById('hint-name').textContent       = hint.name;
          document.getElementById('hint-first-char').textContent = hint.firstChar;
          document.getElementById('hint-pref').textContent       = hint.pref;
          document.getElementById('hint-faculty').textContent    = hint.faculty;
          document.getElementById('hint-dept').textContent       = hint.dept;
          document.getElementById('edu-hint').classList.add('visible');
        }
      } else {
        showStatus('fill-status', response?.error || '入力できませんでした', 'error');
      }
    } catch (e) {
      showStatus('fill-status', 'このページは対応していません（ページをリロードして再試行してください）', 'error');
    }
  });

  // ===== コピーボタン =====
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = document.getElementById(btn.getAttribute('data-target'))?.textContent || '';
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'コピー済';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'コピー'; btn.classList.remove('copied'); }, 2000);
      });
    });
  });

  // ===== タブ切り替え =====
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // ===== 保存 =====
  document.getElementById('btn-save').addEventListener('click', async () => {
    if (!currentPassword) { showStatus('save-status', 'ロック状態です', 'error'); return; }
    await saveEncrypted(formToProfile(), currentPassword);
    showStatus('save-status', '保存しました', 'success');
  });

  // ===== ロック（手動） =====
  document.getElementById('btn-lock').addEventListener('click', async () => {
    currentPassword = null;
    await clearSession();
    showScreen('lock');
  });

  // ===== 解錠ボタン =====
  document.getElementById('btn-unlock').addEventListener('click', async () => {
    const password = document.getElementById('lock-password').value;
    if (!password) { showStatus('lock-status', 'パスワードを入力してください', 'error'); return; }
    try {
      await unlock(password);
      document.getElementById('lock-password').value = '';
    } catch {
      showStatus('lock-status', 'パスワードが違います', 'error');
    }
  });

  document.getElementById('lock-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-unlock').click();
  });

  // ===== 初回セットアップ =====
  document.getElementById('btn-setup').addEventListener('click', async () => {
    const password = document.getElementById('setup-password').value;
    const confirm  = document.getElementById('setup-password-confirm').value;
    if (password.length < 4) { showStatus('setup-status', 'パスワードは4文字以上にしてください', 'error'); return; }
    if (password !== confirm)  { showStatus('setup-status', 'パスワードが一致しません', 'error'); return; }

    const emptyProfile = { name: {}, birthdate: '', email: '', phone: '', mobile: '', address: { postalCode: '', prefecture: '', city: '', street: '', apartment: '' }, highSchool: {}, undergrad: {}, education: {}, checkSameAddress: true, gender: '', educationLevel: '', graduatedHighSchool: 'はい', studyAbroad: 'なし', seminarName: '', seminarContent: '', clubActivity: '', howKnown: [], interestedIndustries: [], studyAbroadType: [] };
    await saveEncrypted(emptyProfile, password);
    currentPassword = password;
    await saveSession(password);
    profileToForm(emptyProfile);
    showScreen('main');
  });

  // ===== 起動時の画面判定 =====
  // 1. データなし → セットアップ
  // 2. セッションにパスワードあり → 自動解錠（Chrome起動後1回だけ入力すればよい）
  // 3. セッションなし → ロック画面
  async function init() {
    const payload = await loadEncrypted();
    if (!payload) { showScreen('setup'); return; }

    const sessionPw = await loadSession();
    if (sessionPw) {
      try {
        await unlock(sessionPw);
        return;
      } catch {
        // セッションのパスワードが無効（データ変更など）→ ロック画面へ
        await clearSession();
      }
    }

    showScreen('lock');
  }

  init();
})();
