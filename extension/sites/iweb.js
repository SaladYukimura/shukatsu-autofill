// i-web 学校選択ページ専用ハンドラー
const IWebSchool = (() => {

  const GKBN_MAP = {
    '大学':           '3',
    '大学院（修士）': '2',
    '大学院（博士）': '1',
    '高等専門学校':   '7',
    '外国大学日本校': 'A',
    '外国大学':       'B',
  };

  // ひらがな頭文字 → ラジオボタンの value（カタカナグループ）
  const GON_MAP = {
    'あ': 'ア',    'い': 'イ',    'う': 'ウ',    'え': 'エ',    'お': 'オ',
    'か': 'カガ',  'き': 'キギ',  'く': 'クグ',  'け': 'ケゲ',  'こ': 'コゴ',
    'さ': 'サザ',  'し': 'シジ',  'す': 'スズ',  'せ': 'セゼ',  'そ': 'ソゾ',
    'た': 'タダ',  'ち': 'チヂ',  'つ': 'ツヅ',  'て': 'テデ',  'と': 'トド',
    'な': 'ナ',    'に': 'ニ',    'ぬ': 'ヌ',    'ね': 'ネ',    'の': 'ノ',
    'は': 'ハバパ', 'ひ': 'ヒビピ', 'ふ': 'フブプ', 'へ': 'ヘベペ', 'ほ': 'ホボポ',
    'ま': 'マ',    'み': 'ミ',    'む': 'ム',    'め': 'メ',    'も': 'モ',
    'や': 'ヤ',    'ゆ': 'ユ',    'よ': 'ヨ',
    'ら': 'ラ',    'り': 'リ',    'る': 'ル',    'れ': 'レ',    'ろ': 'ロ',
    'わ': 'ワ',    'を': 'ヲ',    'ん': 'ン',
  };

  const PREF_MAP = {
    '北海道': '1',  '青森県': '2',  '岩手県': '3',  '宮城県': '4',  '秋田県': '5',
    '山形県': '6',  '福島県': '7',  '茨城県': '8',  '栃木県': '9',  '群馬県': '10',
    '埼玉県': '11', '千葉県': '12', '東京都': '13', '神奈川県': '14', '新潟県': '15',
    '富山県': '16', '石川県': '17', '福井県': '18', '山梨県': '19', '長野県': '20',
    '岐阜県': '21', '静岡県': '22', '愛知県': '23', '三重県': '24', '滋賀県': '25',
    '京都府': '26', '大阪府': '27', '兵庫県': '28', '奈良県': '29', '和歌山県': '30',
    '鳥取県': '31', '島根県': '32', '岡山県': '33', '広島県': '34', '山口県': '35',
    '徳島県': '36', '香川県': '37', '愛媛県': '38', '高知県': '39', '福岡県': '40',
    '佐賀県': '41', '長崎県': '42', '熊本県': '43', '大分県': '44', '宮崎県': '45',
    '鹿児島県': '46', '沖縄県': '47',
  };

  function selectRadio(name, value) {
    const radio = document.querySelector(`input[type="radio"][name="${name}"][value="${value}"]`);
    if (radio) { FormFiller.clickJqRadio(radio); return true; }
    return false;
  }

  // value一致が失敗したときのラベルテキスト一致フォールバック
  function selectRadioByLabel(name, labelText) {
    const radios = Array.from(document.querySelectorAll(`input[type="radio"][name="${name}"]`));
    if (!radios.length) return false;
    return FormFiller.selectRadioByText(radios, labelText);
  }

  function isSchoolSelectPage() {
    return !!document.querySelector('input[type="radio"][name="gkbn"]');
  }

  function fillSchoolSelect(profile) {
    const edu = profile.education || {};
    let filled = 0;

    // 学校区分: value一致 → ラベルテキスト一致の順で試みる
    if (edu.type) {
      const gkbnVal = GKBN_MAP[edu.type];
      const ok = (gkbnVal && selectRadio('gkbn', gkbnVal)) || selectRadioByLabel('gkbn', edu.type);
      if (ok) filled++;
    }

    // 頭文字: カタカナvalue一致 → ひらがなラベル一致の順で試みる
    if (edu.firstChar) {
      const gonVal = GON_MAP[edu.firstChar];
      const ok = (gonVal && selectRadio('gon', gonVal)) || selectRadioByLabel('gon', edu.firstChar);
      if (ok) filled++;
    }

    // 所在地: チェックボックスを有効化してから都道府県を選択
    if (edu.prefecture) {
      const prefCb = document.querySelector('input[type="checkbox"][name="kenflg"], input[type="checkbox"][name="dkenflg"], input[type="checkbox"][name="pref_flg"]');
      if (prefCb && !prefCb.checked) FormFiller.clickJqCheckbox(prefCb, true);

      const prefVal = PREF_MAP[edu.prefecture];
      const ok = (prefVal && selectRadio('dken', prefVal)) || selectRadioByLabel('dken', edu.prefecture);
      if (ok) filled++;
    }

    return filled;
  }

  return { isSchoolSelectPage, fillSchoolSelect };
})();
