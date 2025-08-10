chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id || !tab.url) return
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const title = document.querySelector('h1, h2')?.innerText || document.title
        const priceText = (document.body.innerText.match(/\$[\d,]+/) || [])[0]
        const allImgs = Array.from(document.querySelectorAll('img'))
          .map(img => img.src)
          .filter(Boolean)
          .map(u => u.split('?')[0])
        const imagesDom = Array.from(new Set(allImgs.filter(u => /scontent|fbcdn|\.(?:jpg|jpeg|png|webp)$/i.test(u)))).slice(0, 20)
        const imagesMeta = Array.from(document.querySelectorAll('meta[property="og:image"]'))
          .map(m => m.content)
          .filter(Boolean)
        const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href
        const titleMeta = document.querySelector('meta[property="og:title"]')?.content || ''
        const descriptionMeta = document.querySelector('meta[property="og:description"]')?.content || ''
        const bodyText = document.body.innerText || ''
        const text = bodyText.slice(0, 30000)
        const descMatch = bodyText.match(/Description\n([\s\S]*?)(?:\nGetting Around|\nAmenities|\nSee (?:more|less)|\n$)/i)
        const descriptionText = descMatch ? descMatch[1].trim() : ''
        const locMatch = bodyText.match(/Location(?:\s+is\s+approximate)?\n([\s\S]*?)(?:\nDescription|\nGetting Around|\n$)/i)
        const locationText = locMatch ? locMatch[1].trim() : ''
        return { title, price: priceText, imagesDom, imagesMeta, canonical, titleMeta, descriptionMeta, descriptionText, locationText, text }
      }
    })

    const apiBase = 'http://localhost:8000'
    const payload = {
      source_url: tab.url,
      raw_json: {
        title: result.title,
        price: result.price,
        images: result.imagesDom,
        images_meta: result.imagesMeta,
        canonical_url: result.canonical,
        title_meta: result.titleMeta,
        description_meta: result.descriptionMeta,
        description_text: result.descriptionText,
        location_text: result.locationText
      },
      raw_text: result.text
    }
    await fetch(`${apiBase}/api/ingest`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    })
  } catch (e) {
    console.error('Roof Ingest error', e)
  }
})


