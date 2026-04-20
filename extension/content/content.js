// Content script: ポップアップからのメッセージを受け取りフォームを自動入力する
(() => {
  const hostname = location.hostname;
  const isIWeb = hostname.endsWith('.i-webs.jp') || hostname.endsWith('.i-web.jpn.com');
  const isAxol = hostname === 'job.axol.jp';

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'FILL_FORM') {
      try {
        const profile = message.profile;

        // i-web 学校選択ページ（gkbn ラジオがある画面）
        if (isIWeb && typeof IWebSchool !== 'undefined' && IWebSchool.isSchoolSelectPage()) {
          const filledCount = IWebSchool.fillSchoolSelect(profile);
          sendResponse({ success: true, filledCount });
          return true;
        }

        // axol: 住所フォームを国内モードに切り替え＋disabled 解除
        if (isAxol) {
          // 「日本国外の場合」チェックを外す
          // ※ change イベントを発火すると axol JS が kaigai モードに戻すため、DOM 直接操作のみ
          document.querySelectorAll('input[name="kaigaig"], input[name="kaigaik"]').forEach(cb => {
            cb.checked = false;
          });
          // 国内フォームを強制表示、海外フォームを非表示（axol JS をバイパス）
          document.querySelectorAll('[class*="jsJusho"][class*="Japan"]').forEach(el => { el.style.display = ''; });
          document.querySelectorAll('[class*="jsJusho"][class*="Kaigai"]').forEach(el => { el.style.display = 'none'; });
          // 郵便番号連動 disabled の都道府県 select を解除
          document.querySelectorAll('select[name="keng"], select[name="kenk"]').forEach(el => {
            el.removeAttribute('disabled');
          });
        }

        const fieldMap = FieldMatcher.detectFields(document);
        let filledCount = FormFiller.fillAll(fieldMap, profile);

        // 「現住所と同じ」チェックボックス
        if (profile.checkSameAddress) {
          const checkboxes = FieldMatcher.findSameAddressCheckboxes(document);
          for (const cb of checkboxes) {
            if (!cb.checked) {
              // jqTransform チェックボックスは visual の <a> をクリックして同期
              const jqA = cb.closest('.jqTransformCheckboxWrapper')?.querySelector('a.jqTransformCheckbox');
              if (jqA) {
                jqA.click();
              } else {
                cb.checked = true;
                cb.dispatchEvent(new Event('change', { bubbles: true }));
              }
              filledCount++;
            }
          }
        }

        const edu = profile.education || {};
        sendResponse({
          success: true,
          filledCount,
          educationHint: {
            type:      edu.type       || '',
            name:      edu.name       || '',
            firstChar: edu.firstChar  || '',
            pref:      edu.prefecture || '',
            faculty:   edu.faculty    || '',
            dept:      edu.department || '',
          }
        });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
      return true;
    }
  });
})();
