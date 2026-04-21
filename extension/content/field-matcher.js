// フォームフィールドの検出・分類
const FieldMatcher = (() => {

  // name/id属性の完全一致・前方一致マップ
  // ※ 前方一致: name="gtel1" → 'gtel' にマッチ（末尾が数字の場合）
  const ATTR_MAP = {
    lastName:      ['sei', 'lastname', 'last_name', 'family_name', 'myoji', 'lname',
                    'kname1', 'k_name1', 'kanji_name1', 'name_1',
                    'kanji_sei'],                           // axol
    firstName:     ['mei', 'firstname', 'first_name', 'given_name', 'namae', 'fname',
                    'kname2', 'k_name2', 'kanji_name2', 'name_2',
                    'kanji_na'],                            // axol
    lastNameKana:  ['sei_kana', 'seikana', 'kana_sei', 'kanaSei', 'lastname_kana', 'last_name_kana',
                    'kana1', 'sei_ruby', 'name1_kana', 'lname_kana', 'lkana',
                    'yname1', 'y_name1', 'kana_name1', 'ruby1'],
    firstNameKana: ['mei_kana', 'meikana', 'kana_mei', 'kanaMei', 'firstname_kana', 'first_name_kana',
                    'kana2', 'mei_ruby', 'name2_kana', 'fname_kana', 'fkana',
                    'yname2', 'y_name2', 'kana_name2', 'ruby2',
                    'kana_na'],                             // axol
    birthYear:     ['birth_year', 'birthyear', 'year_of_birth', 'bd_year', 'byear', 'birthday_year',
                    'ybirth', 'birth_nen', 'seibirth_y',
                    'birth_y'],                             // axol (birth_Y → lowercase)
    birthMonth:    ['birth_month', 'birthmonth', 'month_of_birth', 'bd_month', 'bmonth', 'birthday_month',
                    'mbirth', 'birth_tsuki', 'seibirth_m',
                    'birth_m'],                             // axol
    birthDay:      ['birth_day', 'birthdate_day', 'day_of_birth', 'bd_day', 'bday', 'birthday_day',
                    'dbirth', 'birth_nichi', 'seibirth_d',
                    'birth_d'],                             // axol
    postalCode:    ['postal', 'zip', 'post_no', 'postal_code', 'postcode',
                    'yubin', 'gyubin', 'kyubin', 'zipcode'],
    // axol: 郵便番号2分割（上3桁 / 下4桁）現住所・休暇住所それぞれ
    postalCodeH:   ['yubing_h', 'yubink_h'],
    postalCodeL:   ['yubing_l', 'yubink_l'],
    // 都道府県（axol: keng=現住所, kenk=休暇）
    prefecture:    ['pref', 'prefecture', 'todofuken', 'ken', 'gken', 'kken',
                    'keng', 'kenk'],                        // axol
    // i-web: 市区郡町村＋番地を1フィールドにまとめて入力（city + street 結合値）
    cityStreet:    ['gadrs1', 'kadrs1', 'adrs1'],
    // axol: 市区郡町村のみ（jushog1/jushok1）
    city:          ['city', 'address2', 'addr2', 'machi',
                    'jushog1', 'jushok1'],                  // axol
    // axol: 番地・丁目（jushog2/jushok2）
    street:        ['banchi', 'jushog2', 'jushok2'],        // axol
    // アパート・建物（axol: jushog3/jushok3）
    apartment:     ['apt', 'apartment', 'building', 'address3', 'addr3',
                    'gadrs2', 'kadrs2', 'adrs2',
                    'jushog3', 'jushok3'],                  // axol
    // 電話（axol: telg_h/m/l=現住所, telk_h/m/l=休暇 → 3分割配列）
    phone:         ['tel', 'phone', 'telephone', 'fixed_tel', 'home_tel', 'gtel', 'ktel',
                    'telg_h', 'telg_m', 'telg_l', 'telk_h', 'telk_m', 'telk_l'],  // axol
    // 携帯電話（axol: keitai_h/m/l → 3分割配列）
    mobile:        ['mobile', 'cell', 'keitai_tel', 'keitai_phone', 'tel_m', 'sp_tel', 'ketai', 'kttel',
                    'keitai_h', 'keitai_m', 'keitai_l'],   // axol
    // スキップ対象メールアドレス（携帯メール・その他任意アドレス）
    mobileEmail:   ['keitai_mail', 'keitai_address', 'mobile_mail', 'mobile_email', 'sp_mail',
                    'kmail'],                               // axol: その他アドレス（任意）→ 入力不要
    // email2 を先に定義することで email の prefix match より優先される
    emailConfirm:  ['email2', 'mail2', 'e_mail2', 'mailaddr2', 'email_confirm', 'mail_confirm'],
    email:         ['email', 'mail', 'e_mail', 'mailaddr'],
    emailLocal:    ['account', 'email_account', 'mail_account', 'local_part', 'userid', 'mailid'],
    emailDomain:   ['domain', 'email_domain', 'mail_domain', 'domain_part', 'mailhost'],
    // 卒業年月（axol: school_to_Y/m）
    graduateYear:  ['graduate_year', 'grad_year', 'sotsu_year', 'sotsu_nen', 'syear',
                    'school_to_y'],                         // axol
    graduateMonth: ['graduate_month', 'grad_month', 'sotsu_month', 'sotsu_tsuki', 'smonth',
                    'school_to_m'],                         // axol
    // 入学年月（axol: school_fr_Y/m）
    enrollYear:    ['enroll_year', 'enter_year', 'nyugaku_year', 'nyugaku_nen',
                    'school_fr_y', 'school_from_y'],        // axol
    enrollMonth:   ['enroll_month', 'enter_month', 'nyugaku_month',
                    'school_fr_m', 'school_from_m'],        // axol
    schoolType:    ['school_type', 'gakko_kubun'],
    firstChar:     ['initial'],                             // axol: 大学名頭文字
    schoolName:    ['school_name', 'gakko_name', 'daigaku_name'],
    faculty:       ['faculty', 'gakubu'],
    department:    ['department', 'gakka', 'major'],
    highSchoolPrefecture:   ['koko_ken'],                   // axol: 高校の都道府県
    highSchoolName:         ['hs_name', 'highschool_name', 'high_school_name', 'kotogakko_name',
                             'koko_word'],                  // axol: 高校名検索
    highSchoolEnrollYear:   ['hs_enroll_year', 'hs_enter_year', 'highschool_enter_year',
                             'koko_from_y'],                // axol
    highSchoolEnrollMonth:  ['hs_enroll_month', 'hs_enter_month', 'highschool_enter_month',
                             'koko_from_m'],                // axol
    highSchoolGraduateYear: ['hs_graduate_year', 'hs_grad_year', 'highschool_grad_year',
                             'koko_to_y'],                  // axol
    highSchoolGraduateMonth:['hs_graduate_month', 'hs_grad_month', 'highschool_grad_month',
                             'koko_to_m'],                  // axol
    undergradName:          ['undergrad_name', 'bachelor_name', 'daigaku_name_bachelor'],
    undergradGraduateYear:  ['undergrad_grad_year', 'bachelor_grad_year'],
    undergradGraduateMonth: ['undergrad_grad_month', 'bachelor_grad_month'],
    seminarName:        ['seminar_name', 'zemi_name', 'lab_name', 'kenkyushitsu',
                         'zemi'],                           // axol
    seminarContent:     ['seminar_content', 'zemi_content', 'research_content'],
    clubActivity:       ['club_name', 'circle_name', 'club1', 'dantai_name1',
                         'club',                            // axol
                         'bikob'],                          // i-web
    howKnown:           ['how_known', 'shiru_keiki', 'motive'],
  };

  // ラベルテキストのキーワードパターン（ATTR_MAP で拾えなかった場合の補助）
  const LABEL_PATTERNS = {
    lastName:      [/^姓$/, /^姓[：:　\s]/, /氏名.*?姓/],
    firstName:     [/^名$/, /^名[：:　\s]/, /氏名.*?名/],
    lastNameKana:  [/^セイ$/, /^セイ[：:　\s]/, /カナ.*?姓|ふりがな.*?姓/i],
    firstNameKana: [/^メイ$/, /^メイ[：:　\s]/, /カナ.*?名|ふりがな.*?名/i],
    birthYear:     [/生年月日.*?年|birth.*?year/i],
    birthMonth:    [/生年月日.*?月|birth.*?month/i],
    birthDay:      [/生年月日.*?日|birth.*?day/i],
    birthdate:     [/生年月日|birthdate/i],
    // 高校固有パターンを先に（graduateYear より前に評価させる）
    highSchoolGraduateYear:  [/高[等校].*卒業.*年$|高等学校.*年$/],
    highSchoolGraduateMonth: [/高[等校].*卒業.*月$|高等学校.*月$/],
    highSchoolEnrollYear:    [/高[等校].*入学.*年$|高等学校.*入学.*年$/],
    highSchoolEnrollMonth:   [/高[等校].*入学.*月$|高等学校.*入学.*月$/],
    graduateYear:  [/卒業.{0,6}年$|修了.{0,6}年$/],
    graduateMonth: [/卒業.{0,6}月$|修了.{0,6}月$/],
    enrollYear:    [/入学.{0,6}年$/],
    enrollMonth:   [/入学.{0,6}月$/],
    postalCode:    [/郵便番号|postal|zip/i],
    prefecture:    [/都道府県/i],
    city:          [/市区郡|市区町村|地名/i],
    street:        [/番地|丁目|町域/i],
    apartment:     [/アパート|マンション|建物/i],
    phone:         [/電話番号|固定電話/i],
    mobileEmail:   [/携帯.*?(アドレス|メール|mail)/i],
    mobile:        [/携帯(電話|番号)|スマホ(番号|電話)/i],
    email:         [/E.?mail|メールアドレス|^メール$/i],
    gender:              [/性別/],
    educationLevel:      [/最終学歴/],
    graduatedHighSchool: [/高校を卒業/],
    studyAbroad:         [/留学経験/],
    highSchoolName:         [/高校名|出身高校(?!.*卒業)|高等学校名/],
    highSchoolEnrollYear:   [/高校.*入学.*年|出身高校.*入学.*年/],
    highSchoolEnrollMonth:  [/高校.*入学.*月|出身高校.*入学.*月/],
    highSchoolGraduateYear: [/高校.*卒業.*年|出身高校.*卒業.*年/],
    highSchoolGraduateMonth:[/高校.*卒業.*月|出身高校.*卒業.*月/],
    undergradName:          [/出身大学|学士.*(?:大学|学部)|大学.*学部.*学科.*大学院/i],
    undergradGraduateYear:  [/出身大学.*卒業.*年|学士.*卒業.*年|大学.*卒業年.*大学院/i],
    undergradGraduateMonth: [/出身大学.*卒業.*月|学士.*卒業.*月|大学.*卒業月.*大学院/i],
    seminarName:         [/ゼミ.{0,4}研究室名|ゼミ名|研究室名/],
    seminarContent:      [/研究内容/],
    clubActivity:        [/団体名[１1]$|部活.*名$|サークル.*名$|^団体名$/],
    howKnown:            [/知ったきっかけ|きっかけ/],
  };

  function cleanLabel(text) {
    return text.replace(/[：:]\s*$/, '').replace(/\s+/g, ' ').trim();
  }

  function getRadioGroupLabel(radios) {
    const first = radios[0];

    // aria-labelledby（axol など）
    const group = first.closest('[role="radiogroup"]');
    if (group) {
      const labelledBy = group.getAttribute('aria-labelledby');
      if (labelledBy) {
        const ref = document.getElementById(labelledBy);
        if (ref) return cleanLabel(ref.textContent);
      }
    }

    const dd = first.closest('dd');
    if (dd) {
      let el = dd.previousElementSibling;
      while (el) {
        if (el.tagName === 'DT') return cleanLabel(el.textContent);
        el = el.previousElementSibling;
      }
    }
    const td = first.closest('td');
    if (td) {
      const prev = td.previousElementSibling;
      if (prev) return cleanLabel(prev.textContent);
    }
    const fieldset = first.closest('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector('legend');
      if (legend) return cleanLabel(legend.textContent);
    }
    return '';
  }

  function getRadioOptionLabel(radio) {
    const wrapper = radio.closest('.jqTransformRadioWrapper');
    if (wrapper) {
      let next = wrapper.nextSibling;
      while (next) {
        if (next.nodeType === Node.TEXT_NODE) {
          const t = cleanLabel(next.textContent);
          if (t) return t;
        } else if (next.nodeType === Node.ELEMENT_NODE) {
          if (next.tagName === 'LABEL' || next.tagName === 'SPAN') return cleanLabel(next.textContent);
          break;
        }
        next = next.nextSibling;
      }
    }
    if (radio.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(radio.id)}"]`);
      if (lbl) return cleanLabel(lbl.textContent);
    }
    const parentLabel = radio.closest('label');
    if (parentLabel) return cleanLabel(parentLabel.textContent);
    return radio.value;
  }

  function getLabelText(el) {
    const texts = [];

    if (el.id) {
      const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (label) texts.push(cleanLabel(label.textContent));
    }

    const parentLabel = el.closest('label');
    if (parentLabel) texts.push(cleanLabel(parentLabel.textContent));

    const dd = el.closest('dd');
    if (dd) {
      const dt = dd.previousElementSibling;
      if (dt && dt.tagName === 'DT') texts.push(cleanLabel(dt.textContent));
    }

    const cell = el.closest('td');
    if (cell) {
      const prev = cell.previousElementSibling;
      if (prev && (prev.tagName === 'TH' || prev.tagName === 'TD')) {
        texts.push(cleanLabel(prev.textContent));
      }
      const siblings = Array.from(cell.childNodes);
      const idx = siblings.indexOf(el);
      for (let i = idx - 1; i >= 0; i--) {
        const node = siblings[i];
        if (node.nodeType === Node.TEXT_NODE) {
          const t = cleanLabel(node.textContent);
          if (t) { texts.push(t); break; }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          texts.push(cleanLabel(node.textContent));
          break;
        }
      }
    }

    if (!cell) {
      const siblings = Array.from(el.parentElement?.childNodes || []);
      const idx = siblings.indexOf(el);
      for (let i = idx - 1; i >= 0; i--) {
        const node = siblings[i];
        if (node.nodeType === Node.TEXT_NODE) {
          const t = cleanLabel(node.textContent);
          if (t) { texts.push(t); break; }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          texts.push(cleanLabel(node.textContent));
          break;
        }
      }
    }

    // jqTransformSelectWrapper の直後の「年」「月」ラベルを追加取得
    // 例: <div class="jqTransformSelectWrapper">...</div><label>年</label>
    const jqWrapper = el.closest('.jqTransformSelectWrapper, .jqTransformInputWrapper');
    if (jqWrapper) {
      let next = jqWrapper.nextSibling;
      while (next) {
        if (next.nodeType === Node.TEXT_NODE) {
          const t = cleanLabel(next.textContent);
          if (t) { texts.push(t); break; }
        } else if (next.nodeType === Node.ELEMENT_NODE) {
          if (next.tagName === 'LABEL' || next.tagName === 'SPAN') texts.push(cleanLabel(next.textContent));
          break;
        }
        next = next.nextSibling;
      }
    }

    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const ref = document.getElementById(labelledBy);
      if (ref) texts.push(cleanLabel(ref.textContent));
    }

    return texts.join(' ');
  }

  function detectTypeByAttr(el) {
    const name = (el.getAttribute('name') || '').toLowerCase().replace(/[\[\]]/g, '');
    const id   = (el.id || '').toLowerCase();

    for (const [type, keywords] of Object.entries(ATTR_MAP)) {
      for (const kw of keywords) {
        if (name === kw || id === kw) return type;
        // gtel1, kyubin1 のような末尾数字パターン
        if (name.startsWith(kw) && /^\d+$/.test(name.slice(kw.length))) return type;
        if (id.startsWith(kw)   && /^\d+$/.test(id.slice(kw.length)))   return type;
      }
    }
    return null;
  }

  function detectTypeByLabel(labelText) {
    for (const [type, patterns] of Object.entries(LABEL_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(labelText)) return type;
      }
    }
    return null;
  }

  function findSameAddressCheckboxes(root = document) {
    return Array.from(root.querySelectorAll('input[type="checkbox"]')).filter(cb => {
      // 海外フラグ（kaigaig / kaigaik）は絶対に対象外
      if (/^kaigai/i.test(cb.name || '')) return false;
      // jqTransform でラップされていると label が兄弟要素になるため、広めのコンテナで検索
      const container = cb.closest('.formbox, .form-group, fieldset, tr, li, section')
                     || cb.parentElement?.parentElement;
      const nearby = container?.textContent || '';
      return /現住所と同じ|同上|住所.*同じ|連絡先.*同じ|現在.*住所.*同じ/i.test(nearby);
    });
  }

  function detectFields(root = document) {
    const result = {};
    let schoolContext = null; // 'highSchool' | 'undergrad' | 'university'
    const inputs = root.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), select, textarea'
    );

    for (const el of inputs) {
      let type = detectTypeByAttr(el);
      const label = getLabelText(el);

      // emailLocal/emailDomain でもラベルが "携帯" なら mobileEmail としてスキップ
      if ((type === 'emailLocal' || type === 'emailDomain') && /携帯/.test(label)) {
        continue;
      }

      if (!type) type = detectTypeByLabel(label);

      // DTラベルの内容でスクールコンテキストを更新（フィールド未検出でも更新する）
      // 例: <dt>高等学校</dt> → 以降の「卒業年月」を高校用に振り替える
      const dtEl = el.closest('dd')?.previousElementSibling;
      if (dtEl?.tagName === 'DT') {
        const dtText = dtEl.textContent;
        if (/高校|高等学校/.test(dtText) && !/大学/.test(dtText)) schoolContext = 'highSchool';
        else if (/出身大学(?!院)|学士/.test(dtText))              schoolContext = 'undergrad';
        else if (/大学院|研究科/.test(dtText))                    schoolContext = 'university';
      }

      if (!type || type === 'mobileEmail') continue;

      // 検出されたフィールド種別でもスクールコンテキストを更新
      if (type === 'highSchoolName') schoolContext = 'highSchool';
      else if (type === 'undergradName') schoolContext = 'undergrad';
      else if (type === 'schoolName' || type === 'faculty' || type === 'department') schoolContext = 'university';

      if (schoolContext === 'highSchool') {
        if (type === 'graduateYear')  type = 'highSchoolGraduateYear';
        if (type === 'graduateMonth') type = 'highSchoolGraduateMonth';
        if (type === 'enrollYear')    type = 'highSchoolEnrollYear';
        if (type === 'enrollMonth')   type = 'highSchoolEnrollMonth';
      } else if (schoolContext === 'undergrad') {
        if (type === 'graduateYear')  type = 'undergradGraduateYear';
        if (type === 'graduateMonth') type = 'undergradGraduateMonth';
      }

      if (result[type]) {
        if (!Array.isArray(result[type])) result[type] = [result[type]];
        result[type].push(el);
      } else {
        result[type] = el;
      }
    }

    // チェックボックスグループを検出する汎用ヘルパー
    function findCheckboxGroup(root, pattern) {
      for (const labelEl of root.querySelectorAll('dt, th, legend, .form-label, [class*="label"]')) {
        if (!pattern.test(labelEl.textContent)) continue;
        const container = labelEl.nextElementSibling
          || labelEl.closest('tr')?.querySelector('td:last-child')
          || labelEl.closest('dl, fieldset, .form-group, tr')?.querySelector('dd, td:last-child')
          || labelEl.parentElement;
        if (!container) continue;
        const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
        if (checkboxes.length >= 2) return checkboxes;
      }
      return null;
    }

    // きっかけ チェックボックスグループ（テキスト検出より優先）
    const howKnownCbs = findCheckboxGroup(root, /きっかけ|知った.{0,5}経緯/);
    if (howKnownCbs) result['howKnown'] = { __checkboxGroup: true, checkboxes: howKnownCbs };

    // 興味のある業界 チェックボックスグループ
    const industryPattern = /興味.{0,6}業界|志望.{0,4}業界|業界.*?選択/;
    const industryCbs = findCheckboxGroup(root, industryPattern);
    if (industryCbs && !result['interestedIndustries']) {
      result['interestedIndustries'] = { __checkboxGroup: true, checkboxes: industryCbs };
    }

    // 留学形態 チェックボックスグループ
    const studyAbroadTypeCbs = findCheckboxGroup(root, /留学形態|留学.*種別/);
    if (studyAbroadTypeCbs && !result['studyAbroadType']) {
      result['studyAbroadType'] = { __checkboxGroup: true, checkboxes: studyAbroadTypeCbs };
    }

    // Radio groups (性別・最終学歴・きっかけなど)
    const RADIO_TYPES = new Set(['gender', 'educationLevel', 'graduatedHighSchool', 'studyAbroad', 'howKnown', 'interestedIndustries']);
    // howKnown/interestedIndustries はテキスト検出より優先してラジオグループで上書き
    const RADIO_OVERRIDE_TYPES = new Set(['howKnown', 'interestedIndustries']);
    const radioGroups = {};
    root.querySelectorAll('input[type="radio"]').forEach(radio => {
      if (!radio.name) return;
      if (!radioGroups[radio.name]) radioGroups[radio.name] = [];
      radioGroups[radio.name].push(radio);
    });
    for (const radios of Object.values(radioGroups)) {
      const groupLabel = getRadioGroupLabel(radios);
      if (!groupLabel) continue;
      const type = detectTypeByLabel(groupLabel);
      if (!type || !RADIO_TYPES.has(type)) continue;
      if (!result[type] || RADIO_OVERRIDE_TYPES.has(type)) {
        result[type] = { __radioGroup: true, radios };
      }
    }

    // name属性による直接マッピング（axol固有ラジオ）
    const RADIO_NAME_MAP = {
      'kubun':   'schoolType',         // 大学院/大学/高等専門学校
      'kokushi': 'schoolNationalType', // 国立/公立/私立
    };
    for (const [radioName, type] of Object.entries(RADIO_NAME_MAP)) {
      if (radioGroups[radioName] && !result[type]) {
        result[type] = { __radioGroup: true, radios: radioGroups[radioName] };
      }
    }

    return result;
  }

  return { detectFields, getLabelText, detectTypeByAttr, detectTypeByLabel, findSameAddressCheckboxes, getRadioOptionLabel, getRadioGroupLabel };
})();
