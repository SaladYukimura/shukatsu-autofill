// フォーム入力実行
const FormFiller = (() => {

  function setInputValue(el, value) {
    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value');
    if (setter && setter.set) setter.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  }

  // jqTransform の見た目も更新する
  function updateJqTransformDisplay(select, optionText) {
    const wrapper = select.closest('.jqTransformSelectWrapper');
    if (!wrapper) return;
    const span = wrapper.querySelector(':scope > div > span');
    if (span) span.textContent = optionText;
    wrapper.querySelectorAll('ul li a').forEach(a => {
      a.classList.toggle('selected', a.textContent.trim() === optionText);
    });
  }

  function clickJqRadio(radio) {
    const jqA = radio.closest('.jqTransformRadioWrapper')?.querySelector('a.jqTransformRadio');
    if (jqA) jqA.click();
    // jqTransformのクリックだけでは checked が更新されない場合があるため、直接セットも行う
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function getCheckboxLabel(cb) {
    if (cb.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(cb.id)}"]`);
      if (lbl) return lbl.textContent.trim();
    }
    const parentLabel = cb.closest('label');
    if (parentLabel) return parentLabel.textContent.trim();
    const wrapper = cb.closest('.jqTransformCheckboxWrapper');
    if (wrapper) {
      let next = wrapper.nextSibling;
      while (next) {
        if (next.nodeType === Node.TEXT_NODE && next.textContent.trim()) return next.textContent.trim();
        if (next.nodeType === Node.ELEMENT_NODE) return next.textContent.trim();
        next = next.nextSibling;
      }
    }
    return cb.value;
  }

  function clickJqCheckbox(cb, shouldCheck) {
    if (cb.checked === shouldCheck) return;
    const jqA = cb.closest('.jqTransformCheckboxWrapper')?.querySelector('a.jqTransformCheckbox');
    if (jqA) jqA.click();
    else {
      cb.checked = shouldCheck;
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function selectCheckboxesByText(checkboxes, values) {
    const targets = Array.isArray(values) ? values.map(v => String(v).trim()) : [String(values).trim()];
    let any = false;
    for (const cb of checkboxes) {
      const label = getCheckboxLabel(cb);
      const match = targets.some(t => label === t || label.includes(t) || t.includes(label));
      if (match) { clickJqCheckbox(cb, true); any = true; }
    }
    return any;
  }

  function selectRadioByText(radios, value) {
    const target = String(value).trim();

    // "大学/University" のようなスラッシュ区切り多言語ラベルを考慮したスコア
    function score(label) {
      if (label === target) return 4;
      // スラッシュで分割して各部分と完全一致
      const parts = label.split('/').map(p => p.trim());
      if (parts.some(p => p === target)) return 3;
      // 先頭一致（次が区切り文字または終端 — "大学院"が"大学"にマッチしないようにする）
      if (label.startsWith(target)) {
        const next = label[target.length];
        if (!next || /[\s\/\-（）()]/.test(next)) return 2;
      }
      // 部分一致（フォールバック）
      if (label.includes(target) || target.includes(label)) return 1;
      return 0;
    }

    let best = null, bestScore = 0;
    for (const radio of radios) {
      const label = FieldMatcher.getRadioOptionLabel(radio);
      const s = score(label);
      if (s > bestScore) { bestScore = s; best = radio; }
    }
    if (bestScore > 0 && best) { clickJqRadio(best); return true; }
    return false;
  }

  function setSelectValue(el, value) {
    const target = String(value).trim();
    const targetNum = parseInt(target, 10);
    const options = Array.from(el.options);

    const found = options.find(o => o.text.trim() === target)
      || options.find(o => o.value === target)
      // ゼロ埋め対応: "4" で "04" を選択できるよう数値比較
      || (!isNaN(targetNum) && options.find(o => parseInt(o.value, 10) === targetNum && o.value !== ''))
      || (!isNaN(targetNum) && options.find(o => parseInt(o.text.trim(), 10) === targetNum))
      || options.find(o => o.text.trim().startsWith(target))
      || options.find(o => o.text.trim().includes(target));

    if (found) {
      // native setter を使うことで axol 等のフレームワークによる value 上書きを回避
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value');
      if (nativeSetter?.set) nativeSetter.set.call(el, found.value);
      else el.value = found.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      updateJqTransformDisplay(el, found.text.trim());
    }
  }

  // 郵便番号 2分割（現住所・休暇住所の2セットにも対応）
  function fillSplitPostal(inputs, postalCode) {
    if (!postalCode) return;
    const digits = Converters.toHankaku(String(postalCode)).replace(/\D/g, '');
    for (let i = 0; i < inputs.length; i += 2) {
      setInputValue(inputs[i], digits.slice(0, 3));
      if (inputs[i + 1]) setInputValue(inputs[i + 1], digits.slice(3));
    }
  }

  // 電話番号 3分割（現住所・休暇住所の2セットにも対応）
  function fillSplitPhone(inputs, phoneRaw) {
    if (!phoneRaw) return;
    const phone = Converters.toHankaku(String(phoneRaw)).replace(/[^\d-]/g, '');
    let parts = phone.split('-').filter(Boolean);
    if (parts.length === 1) {
      const d = parts[0];
      if (d.length === 11)      parts = [d.slice(0,3), d.slice(3,7), d.slice(7)];
      else if (d.length === 10) parts = [d.slice(0,3), d.slice(3,6), d.slice(6)];
    }
    for (let i = 0; i < inputs.length; i += 3) {
      for (let j = 0; j < 3 && parts[j] !== undefined; j++) {
        if (inputs[i + j]) setInputValue(inputs[i + j], parts[j]);
      }
    }
  }

  // メール 2分割（account1/@/domain1）+ 確認欄（account2/@/domain2）
  function fillSplitEmail(inputs, email) {
    if (!email) return;
    const atIdx = email.indexOf('@');
    if (atIdx === -1) { inputs.forEach(input => setInputValue(input, email)); return; }
    const local  = email.slice(0, atIdx);
    const domain = email.slice(atIdx + 1);
    for (let i = 0; i < inputs.length; i++) {
      setInputValue(inputs[i], i % 2 === 0 ? local : domain);
    }
  }

  // 生年月日 年/月/日 の分割 select に入力
  function fillSplitDate(inputs, birthdate) {
    if (!birthdate) return;
    const [year, month, day] = birthdate.split('-');
    for (const input of inputs) {
      if (input.tagName === 'SELECT') {
        const nums = Array.from(input.options)
          .map(o => parseInt(o.value || o.text, 10))
          .filter(n => !isNaN(n) && n > 0);
        const max = Math.max(...nums);
        if (max >= 1900) setSelectValue(input, year);
        else if (max <= 12) setSelectValue(input, String(parseInt(month, 10)));
        else setSelectValue(input, String(parseInt(day, 10)));
      } else {
        if (input.type === 'date') { setInputValue(input, birthdate); break; }
        setInputValue(input, birthdate);
        break;
      }
    }
  }

  function getValue(fieldType, profile) {
    const { name, address, education } = profile;
    return {
      lastName:      name?.lastName,
      firstName:     name?.firstName,
      lastNameKana:  name?.lastNameKana,
      firstNameKana: name?.firstNameKana,
      birthdate:     profile.birthdate,
      // 年/月/日 個別フィールドはゼロ埋めなしで渡す（setSelectValue で数値比較する）
      birthYear:     profile.birthdate?.split('-')[0],
      birthMonth:    profile.birthdate?.split('-')[1]?.replace(/^0/, ''),
      birthDay:      profile.birthdate?.split('-')[2]?.replace(/^0/, ''),
      postalCode:    address?.postalCode,
      // axol 2分割郵便番号
      postalCodeH:   address?.postalCode ? address.postalCode.replace(/\D/g, '').slice(0, 3) : '',
      postalCodeL:   address?.postalCode ? address.postalCode.replace(/\D/g, '').slice(3)    : '',
      prefecture:    address?.prefecture,
      cityStreet:    [address?.city, address?.street].filter(Boolean).join(' '),
      city:          address?.city,
      street:        address?.street,
      apartment:     address?.apartment,
      phone:         profile.phone,
      mobile:        profile.mobile,
      email:         profile.email,
      emailConfirm:  profile.email,
      emailLocal:    profile.email?.split('@')[0],
      emailDomain:   profile.email?.split('@')[1],
      graduateYear:  String(education?.graduateYear  || ''),
      graduateMonth: String(education?.graduateMonth || ''),
      enrollYear:    String(education?.enrollYear    || ''),
      enrollMonth:   String(education?.enrollMonth   || ''),
      schoolType:          education?.type,
      schoolNationalType:  education?.nationalType,
      firstChar:           education?.firstChar,
      schoolName:          education?.name,
      faculty:       education?.faculty,
      department:    education?.department,
      gender:              profile.gender,
      educationLevel:      profile.educationLevel,
      graduatedHighSchool: profile.graduatedHighSchool,
      studyAbroad:         profile.studyAbroad,
      highSchoolPrefecture:    profile.highSchool?.prefecture,
      highSchoolName:          profile.highSchool?.name,
      highSchoolEnrollYear:    String(profile.highSchool?.enrollYear  || ''),
      highSchoolEnrollMonth:   String(profile.highSchool?.enrollMonth || ''),
      highSchoolGraduateYear:  String(profile.highSchool?.graduateYear  || ''),
      highSchoolGraduateMonth: String(profile.highSchool?.graduateMonth || ''),
      undergradName:           profile.undergrad?.name,
      undergradGraduateYear:   String(profile.undergrad?.graduateYear  || ''),
      undergradGraduateMonth:  String(profile.undergrad?.graduateMonth || ''),
      seminarName:         profile.seminarName,
      seminarContent:      profile.seminarContent,
      clubActivity:        profile.clubActivity,
      howKnown:            profile.howKnown,
      interestedIndustries: profile.interestedIndustries,
      studyAbroadType:      profile.studyAbroadType,
    }[fieldType];
  }

  // checkSameAddress=true のとき入力を現住所のみに絞るフィールド種別
  const VACATION_SKIP_TYPES = new Set(['postalCode', 'postalCodeH', 'postalCodeL', 'prefecture', 'cityStreet', 'city', 'street', 'apartment', 'phone', 'mobile']);

  function fillAll(fieldMap, profile) {
    let filledCount = 0;
    const skipVacation = !!profile.checkSameAddress;

    for (const [fieldType, el] of Object.entries(fieldMap)) {
      const isArray = Array.isArray(el);
      const raw = getValue(fieldType, profile);

      // Radio group（性別・最終学歴・きっかけなど）
      // raw が配列の場合（howKnown等）は先頭から順に試して最初にマッチした1つを選択
      if (el && el.__radioGroup) {
        const candidates = Array.isArray(raw) ? raw : (raw ? [raw] : []);
        for (const v of candidates) {
          if (selectRadioByText(el.radios, v)) { filledCount++; break; }
        }
        continue;
      }

      // Checkbox group（きっかけなど）
      if (el && el.__checkboxGroup) {
        if (raw && (Array.isArray(raw) ? raw.length > 0 : raw)) {
          if (selectCheckboxesByText(el.checkboxes, raw)) filledCount++;
        }
        continue;
      }

      // ===== 分割入力が必要な特殊フィールド =====

      // 郵便番号 2分割（skipVacation 時は最初の2要素のみ）
      if (isArray && fieldType === 'postalCode') {
        if (raw) { fillSplitPostal(skipVacation ? el.slice(0, 2) : el, raw); filledCount++; }
        continue;
      }

      // 電話番号 3分割（skipVacation 時は最初の3要素のみ）
      if (isArray && (fieldType === 'phone' || fieldType === 'mobile')) {
        if (raw) { fillSplitPhone(skipVacation ? el.slice(0, 3) : el, raw); filledCount++; }
        continue;
      }

      // メール @分割 + 確認欄
      if (isArray && fieldType === 'email') {
        if (raw) { fillSplitEmail(el, raw); filledCount++; }
        continue;
      }

      // 卒業年・月が複数ある場合: DOM順に [高校, 出身大学, 現在の学校] として振り分け
      if (isArray && (fieldType === 'graduateYear' || fieldType === 'graduateMonth')) {
        const isYear = fieldType === 'graduateYear';
        // 現在の学校より前の学校を古い順に並べる（高校 → 出身大学）
        const priorSources = [
          String(isYear ? profile.highSchool?.graduateYear : profile.highSchool?.graduateMonth || ''),
          String(isYear ? profile.undergrad?.graduateYear  : profile.undergrad?.graduateMonth  || ''),
        ].filter(v => v);
        const fillEl = (element, value) => {
          const v = Converters.adaptValue(element, value, fieldType);
          if (!v && v !== 0) return;
          if (element.tagName === 'SELECT') setSelectValue(element, v);
          else setInputValue(element, v);
        };
        if (el.length >= 2) {
          for (let i = 0; i < el.length - 1; i++) {
            const src = priorSources[i] ?? priorSources[0];
            if (src) fillEl(el[i], src);
          }
          if (raw) fillEl(el[el.length - 1], raw);
        } else {
          // 1つだけの場合: 高校 → 出身大学 → 現在の学校 の順で優先
          const singleSrc = priorSources[0] || raw;
          if (singleSrc) fillEl(el[0], singleSrc);
        }
        filledCount++;
        continue;
      }

      // 生年月日 年/月/日分割セレクト
      if (isArray && fieldType === 'birthdate') {
        if (raw) { fillSplitDate(el, raw); filledCount++; }
        continue;
      }

      // ===== 通常フィールド =====
      // skipVacation かつ住所系フィールドの場合は最初の要素（現住所）のみ入力
      const elements = isArray
        ? (skipVacation && VACATION_SKIP_TYPES.has(fieldType) ? [el[0]] : el)
        : [el];
      if (!raw && raw !== 0) continue;

      let filled = false;
      for (const element of elements) {
        const value = Converters.adaptValue(element, raw, fieldType);
        if (!value && value !== 0) continue;
        if (element.tagName === 'SELECT') setSelectValue(element, value);
        else setInputValue(element, value);
        filled = true;
      }
      if (filled) filledCount++;
    }

    return filledCount;
  }

  return { fillAll, setInputValue, setSelectValue, clickJqRadio, clickJqCheckbox, selectRadioByText };
})();
