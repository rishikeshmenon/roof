chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id || !tab.url) return
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const title = document.querySelector('h1, h2')?.innerText || document.title
        const priceText = (document.body.innerText.match(/\$[\d,]+/) || [])[0]
        const images = Array.from(document.querySelectorAll('img')).map(img => img.src).slice(0, 10)
        return { title, price: priceText, images }
      }
    })

    const apiBase = 'http://localhost:8000'
    const payload = {
      source_url: tab.url,
      raw_json: result
    }
    await fetch(`${apiBase}/api/ingest`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    })
  } catch (e) {
    console.error('Roof Ingest error', e)
  }
})


