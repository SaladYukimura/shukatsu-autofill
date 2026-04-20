// 全角↔半角 変換・郵便番号・電話番号フォーマット
const Converters = (() => {
  // 半角英数記号 → 全角
  function toZenkaku(str) {
    return str.replace(/[\x21-\x7E]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) + 0xFEE0)
    ).replace(/ /g, '\u3000');
  }

  // 全角英数記号 → 半角
  function toHankaku(str) {
    return str.replace(/[\uFF01-\uFF5E]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
    ).replace(/\u3000/g, ' ');
  }

  // 数字のみ抽出（全角→半角変換後）
  function digitsOnly(str) {
    return toHankaku(str).replace(/\D/g, '');
  }

  // 郵便番号 → 111-0000 形式（ハイフンあり・半角）
  function formatPostalCode(str) {
    const digits = digitsOnly(str);
    if (digits.length === 7) return digits.slice(0, 3) + '-' + digits.slice(3);
    return str;
  }

  // 郵便番号 → 1110000 形式（ハイフンなし・半角）
  function formatPostalCodeNoHyphen(str) {
    return digitsOnly(str);
  }

  // 電話番号 → 半角（ハイフン区切りはそのまま）
  function formatPhone(str) {
    return toHankaku(str).replace(/[^\d-]/g, '');
  }

  // フィールドが全角のみかどうか判定（placeholder/title属性から）
  function isZenkakuOnly(el) {
    const hints = [
      el.getAttribute('placeholder') || '',
      el.getAttribute('title') || '',
      el.getAttribute('data-validate') || ''
    ].join(' ').toLowerCase();
    return hints.includes('全角') || hints.includes('zenkaku');
  }

  // フィールドが半角のみかどうか判定
  function isHankakuOnly(el) {
    const hints = [
      el.getAttribute('placeholder') || '',
      el.getAttribute('title') || '',
      el.getAttribute('data-validate') || ''
    ].join(' ').toLowerCase();
    return hints.includes('半角') || hints.includes('hankaku');
  }

  // 値を適切な形式に変換してセット
  function adaptValue(el, value, fieldType) {
    if (!value) return '';

    // 電話番号・郵便番号は常に半角
    if (['phone', 'mobile', 'postalCode'].includes(fieldType)) {
      return formatPhone(String(value));
    }

    // 郵便番号（ハイフンなし入力欄）
    if (fieldType === 'postalCodeNoHyphen') {
      return formatPostalCodeNoHyphen(String(value));
    }

    // 全角のみ制約
    if (isZenkakuOnly(el)) {
      return toZenkaku(String(value));
    }

    // 半角のみ制約
    if (isHankakuOnly(el)) {
      return toHankaku(String(value));
    }

    return String(value);
  }

  return { toZenkaku, toHankaku, formatPostalCode, formatPostalCodeNoHyphen, formatPhone, adaptValue, isZenkakuOnly, isHankakuOnly };
})();
