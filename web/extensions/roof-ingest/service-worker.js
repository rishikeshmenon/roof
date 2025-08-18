chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id || !tab.url) return
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        console.log('🚀 ROOF EXTENSION: Starting comprehensive data extraction...')
        
        // STEP 1: AUTO-EXPAND TRUNCATED CONTENT
        console.log('🔍 Looking for "See more" buttons to expand content...')
        
        // Find and click all possible expand buttons
        const expandSelectors = [
          '[role="button"]:is(:contains("See more"), :contains("see more"), :contains("Show more"), :contains("Read more"))',
          'span:is(:contains("See more"), :contains("see more"), :contains("Show more"), :contains("Read more"))',
          'div[role="button"]:is(:contains("See more"), :contains("see more"), :contains("Show more"), :contains("Read more"))',
          '[aria-label*="See more"]',
          '[aria-label*="Show more"]',
          // Generic selectors for elements with "..." or "…"
          'span:contains("...")',
          'span:contains("…")',
          'div:contains("...")',
          'div:contains("…")'
        ]
        
        // More comprehensive search for expand buttons
        const allElements = document.querySelectorAll('*')
        const expandButtons = []
        
        for (const el of allElements) {
          const text = el.textContent || ''
          const ariaLabel = el.getAttribute('aria-label') || ''
          
          if (
            (el.tagName === 'SPAN' || el.tagName === 'DIV' || el.getAttribute('role') === 'button') &&
            (/see\s+more|show\s+more|read\s+more|\.{3,}|…/i.test(text) || 
             /see\s+more|show\s+more/i.test(ariaLabel)) &&
            el.offsetWidth > 0 && el.offsetHeight > 0 // Must be visible
          ) {
            expandButtons.push(el)
          }
        }
        
        console.log(`📋 Found ${expandButtons.length} potential expand buttons`)
        
        // Click each expand button and wait for content to load
        for (let i = 0; i < expandButtons.length; i++) {
          const button = expandButtons[i]
          try {
            console.log(`🖱️  Clicking expand button ${i + 1}:`, button.textContent?.slice(0, 30))
            
            // Scroll to button first
            button.scrollIntoView({ behavior: 'instant', block: 'center' })
            await new Promise(r => setTimeout(r, 200))
            
            // Click the button
            button.click()
            
            // Wait for content to potentially load
            await new Promise(r => setTimeout(r, 800))
            
            console.log(`✅ Clicked expand button ${i + 1}`)
          } catch (e) {
            console.log(`❌ Error clicking button ${i + 1}:`, e.message)
          }
        }
        
        // Additional wait for any dynamic content loading
        console.log('⏳ Waiting for expanded content to fully load...')
        await new Promise(r => setTimeout(r, 1500))
        
        console.log('✨ Content expansion complete! Now extracting data...')
        
        // STEP 2: EXTRACT COMPREHENSIVE DATA FROM EXPANDED PAGE
        
        // Extract full text content first
        const bodyText = document.body.innerText || ''
        const text = bodyText.slice(0, 30000)
        
        // IMPROVED TITLE EXTRACTION
        console.log('🏷️ Extracting listing title...')
        
        let title = ''
        
        // Strategy 1: Look for specific Facebook Marketplace title patterns
        const titleStrategies = [
          // Strategy 1A: Look for Facebook-specific listing title elements
          () => {
            // Look for elements that commonly contain the listing title
            const titleSelectors = [
              'h1[dir="auto"]',  // Common Facebook title pattern
              '[data-testid*="title"]',
              '[aria-label*="listing"]',
              'span[dir="auto"]'  // Try span elements with dir auto
            ]
            
            for (const selector of titleSelectors) {
              const elements = document.querySelectorAll(selector)
              for (const el of elements) {
                const text = el.textContent?.trim()
                if (text && text.length > 10 && text.length < 100 &&
                    !text.toLowerCase().includes('notification') &&
                    !text.toLowerCase().includes('unread') &&
                    !text.toLowerCase().includes('facebook') &&
                    !text.toLowerCase().includes('marketplace') &&
                    !text.toLowerCase().includes('message') &&
                    !text.toLowerCase().includes('menu') &&
                    !text.toLowerCase().includes('imported')) {
                  console.log(`📝 Found title via selector ${selector}: "${text}"`)
                  return text
                }
              }
            }
            return ''
          },
          
          // Strategy 1B: Look for meta title (often better than page title)
          () => {
            const metaTitle = document.querySelector('meta[property="og:title"]')?.content
            if (metaTitle && metaTitle !== 'Facebook' && !metaTitle.includes('Marketplace') && metaTitle.length > 10) {
              console.log(`📝 Found title via meta: "${metaTitle}"`)
              return metaTitle
            }
            return ''
          },
          
          // Strategy 1C: Look for text near price in structured way
          () => {
            const priceElements = document.querySelectorAll('*')
            for (const el of priceElements) {
              const text = el.textContent?.trim()
              if (text && /\$[\d,]+/.test(text) && text.length < 50) {
                // Found a price element, look for title nearby
                let current = el.parentElement
                while (current && current !== document.body) {
                  const titleCandidates = Array.from(current.children)
                  for (const candidate of titleCandidates) {
                    const candidateText = candidate.textContent?.trim()
                    if (candidateText && candidateText.length > 15 && candidateText.length < 100 &&
                        !candidateText.includes('$') &&
                        !candidateText.toLowerCase().includes('notification') &&
                        !candidateText.toLowerCase().includes('unread') &&
                        !candidateText.toLowerCase().includes('facebook') &&
                        !candidateText.toLowerCase().includes('marketplace') &&
                        !candidateText.toLowerCase().includes('imported')) {
                      console.log(`📝 Found title near price: "${candidateText}"`)
                      return candidateText
                    }
                  }
                  current = current.parentElement
                }
              }
            }
            return ''
          },
          
          // Look for text near price that looks like a title
          () => {
            const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
            const priceIndex = lines.findIndex(line => /\$[\d,]+/.test(line))
            
            if (priceIndex >= 0) {
              // Look for title-like text around the price
              for (let i = Math.max(0, priceIndex - 3); i < Math.min(lines.length, priceIndex + 4); i++) {
                const line = lines[i]
                if (line.length > 15 && line.length < 80 && 
                    !line.includes('$') && 
                    !line.match(/\d+\s*(bed|bath|sq|ft)/i) &&
                    !line.match(/^(share|save|contact|apply|facebook|messenger)/i)) {
                  return line
                }
              }
            }
            return ''
          },
          
          // Look for h1/h2 but filter out navigation
          () => {
            const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
              .map(h => h.innerText?.trim())
              .filter(text => text && 
                     text.length > 10 && 
                     text.length < 100 &&
                     !text.toLowerCase().includes('notification') &&
                     !text.toLowerCase().includes('unread') &&
                     !text.toLowerCase().includes('facebook') &&
                     !text.toLowerCase().includes('marketplace') &&
                     !text.toLowerCase().includes('message') &&
                     !text.toLowerCase().includes('menu'))
            
            return headings.length > 0 ? headings[0] : ''
          },
          
          // Fallback to document title if it's descriptive
          () => {
            const docTitle = document.title
            if (docTitle && docTitle !== 'Facebook' && !docTitle.includes('Marketplace') && docTitle.length > 10) {
              return docTitle.split(' - ')[0] // Remove site suffix
            }
            return ''
          }
        ]
        
        // Try each strategy and use the first good result
        for (const strategy of titleStrategies) {
          try {
            const result = strategy()
            if (result && result.length > title.length) {
              title = result
              console.log(`📝 Found title: "${title.slice(0, 50)}..."`)
              break
            }
          } catch (e) {
            console.log('Title strategy failed:', e)
          }
        }
        
        // Final fallback - try to extract title from the actual listing content
        if (!title || title.toLowerCase().includes('notification') || title.length < 5) {
          // Look for property-specific text patterns in the page
          const listingTitlePatterns = [
            /(\d+\s*(?:bed|bedroom|br|bd)\s*\d*\s*(?:bath|bathroom|ba)?[^.]*)/i,
            /(apartment|condo|house|unit|room)[^.]{10,60}/i,
            /\$[\d,]+[^.]{10,60}/i
          ]
          
          for (const pattern of listingTitlePatterns) {
            const match = bodyText.match(pattern)
            if (match && match[0] && match[0].length > 10 && match[0].length < 80) {
              title = match[0].trim()
              console.log(`📝 Found listing title pattern: "${title}"`)
              break
            }
          }
          
          // Ultimate fallback
          if (!title || title.toLowerCase().includes('notification')) {
            title = 'Property Listing'
          }
        }
        
        console.log(`🏷️ Final title: "${title}"`)
        
        const priceText = (document.body.innerText.match(/\$[\d,]+/) || [])[0]
        
        // Comprehensive image extraction
        const allImgs = Array.from(document.querySelectorAll('img'))
          .map(img => {
            // Get the highest quality src available
            return img.src || img.dataset.src || img.getAttribute('data-src') || ''
          })
          .filter(Boolean)
          .map(u => u.split('?')[0]) // Remove query parameters
        
        // Filter for Facebook/quality images and ensure uniqueness
        const imagesDom = Array.from(new Set(allImgs.filter(u => 
          /scontent|fbcdn|\.(?:jpg|jpeg|png|webp)$/i.test(u) && 
          !u.includes('profile') && // Exclude profile images
          !u.includes('emoji') &&  // Exclude emojis
          u.includes('http') // Ensure full URLs
        ))).slice(0, 20)
        
        const imagesMeta = Array.from(document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]'))
          .map(m => m.content)
          .filter(Boolean)
        
        // Also look for images in data attributes and background images
        const backgroundImages = Array.from(document.querySelectorAll('[style*="background-image"]'))
          .map(el => {
            const style = el.style.backgroundImage
            const match = style.match(/url\(['"]?(.*?)['"]?\)/)
            return match ? match[1] : null
          })
          .filter(Boolean)
          .filter(u => /scontent|fbcdn|\.(?:jpg|jpeg|png|webp)$/i.test(u))
        
        // URL and metadata
        const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href
        const titleMeta = document.querySelector('meta[property="og:title"]')?.content || ''
        const descriptionMeta = document.querySelector('meta[property="og:description"]')?.content || ''
        

        
        // ENHANCED POST-EXPANSION TEXT EXTRACTION
        console.log('📝 Extracting text from expanded content...')
        
        // SIMPLE "SEE MORE" EXPANSION
        console.log('🔍 SIMPLE APPROACH: Looking for "See more" buttons...')
        
        // Find all elements that might be "See more" buttons
        const seeMoreButtons = []
        const allElementsForSeeMore = document.querySelectorAll('*')
        
        for (const el of allElementsForSeeMore) {
          const text = el.textContent?.trim() || ''
          
          // Simple check: if it says "See more" and is visible, try clicking it
          if (text === 'See more' || text === 'see more' || text === 'Show more') {
            if (el.offsetWidth > 0 && el.offsetHeight > 0) {
              seeMoreButtons.push(el)
              console.log(`🎯 Found "See more" button: "${text}"`)
            }
          }
        }
        
        // Click all "See more" buttons we found
        for (let i = 0; i < seeMoreButtons.length; i++) {
          const button = seeMoreButtons[i]
          try {
            console.log(`🖱️ Clicking "See more" button ${i + 1}`)
            button.scrollIntoView({ behavior: 'smooth', block: 'center' })
            await new Promise(r => setTimeout(r, 500))
            button.click()
            await new Promise(r => setTimeout(r, 2000)) // Wait for content to load
            console.log(`✅ Clicked "See more" button ${i + 1}`)
          } catch (e) {
            console.log(`❌ Failed to click button ${i + 1}:`, e.message)
          }
        }
        
        // Give extra time for all content to load
        if (seeMoreButtons.length > 0) {
          console.log('⏳ Waiting for all expanded content to load...')
          await new Promise(r => setTimeout(r, 3000))
        }
        
        // SIMPLE DESCRIPTION EXTRACTION (DOM-walking after 'Description')
        console.log('📝 Extracting original Description section (DOM walk)...')
        
        const stopHeadingsRegex = /(getting\s*around|seller\s*details|report\s*this\s*listing|location|photos|images|share|posted|price|apply|contact|suite\s*features|building\s*amenities)/i
        let descriptionText = ''
        
        // Try to locate the 'Description' header element
        const elList = Array.from(document.querySelectorAll('*'))
        const descHeaders = elList.filter(el => (el.textContent || '').trim().toLowerCase() === 'description')
        
        const collectAfterHeader = (headerEl) => {
          let collected = []
          let node = headerEl.nextElementSibling
          let steps = 0
          while (node && steps < 100) {
            const text = (node.innerText || '').trim()
            if (text) {
              // Stop if we hit another section heading
              const firstLine = text.split('\n')[0].trim()
              if (stopHeadingsRegex.test(firstLine.toLowerCase())) break
              collected.push(text)
            }
            // If this node has no further siblings, try moving up to continue across layouts
            if (node.nextElementSibling) {
              node = node.nextElementSibling
            } else {
              // climb up to parent and continue with its next sibling
              let parent = node.parentElement
              let moved = false
              while (parent && !moved) {
                if (parent.nextElementSibling) {
                  node = parent.nextElementSibling
                  moved = true
                } else {
                  parent = parent.parentElement
                }
              }
              if (!moved) break
            }
            steps += 1
          }
          const combined = collected.join('\n\n')
            .replace(/See\s*(more|less)/gi, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim()
          return combined
        }
        
        if (descHeaders.length > 0) {
          for (const header of descHeaders) {
            const combined = collectAfterHeader(header)
            if (combined && combined.length > descriptionText.length) {
              descriptionText = combined
            }
          }
        }
        
        // Fallback to previous text-based heuristics if header not found
        if (!descriptionText) {
          const expandedText = document.body.innerText || ''
          const paragraphs = expandedText
            .split('\n\n')
            .map(p => p.replace(/See\s*(more|less)/gi, '').trim())
            .filter(Boolean)
          const keywords = /(bedroom|bathroom|apartment|condo|unit|lease|rent|furnished|parking)/i
          let best = ''
          for (const p of paragraphs) {
            if (p.length > 120 && keywords.test(p) && !/notification|unread|facebook|marketplace/i.test(p)) {
              if (p.length > best.length) best = p
            }
          }
          descriptionText = best
        }

        
        console.log(`📄 Extracted description length: ${descriptionText.length} chars`)
        if (descriptionText.length > 0) {
          console.log(`📄 Description preview: ${descriptionText.slice(0, 100)}...`)
        }
        
        const locMatch = bodyText.match(/Location(?:\s+is\s+approximate)?\n([\s\S]*?)(?:\nDescription|\nGetting Around|\n$)/i)
        const locationText = locMatch ? locMatch[1].trim() : ''
        
        // Extract bedroom/bathroom info
        const bedroomMatch = bodyText.match(/(\d+)\s*(?:bedrooms?|beds?|br|bd)\b/i)
        const bathroomMatch = bodyText.match(/(\d+(?:\.\d+)?)\s*(?:bath(?:rooms?)?|ba)\b/i)
        
        // Extract availability info
        const availabilityMatch = bodyText.match(/(?:Available|Move.?in|Ready)\s*:?\s*([^\n]{1,100})/i)
        const availabilityText = availabilityMatch ? availabilityMatch[1].trim() : ''
        
        // Extract pets/furnished info
        const petsText = bodyText.match(/(pets?\s*(?:ok|allowed|welcome|friendly)|no\s*pets?)/i)?.[0] || ''
        const furnishedText = bodyText.match(/(furnished|unfurnished)/i)?.[0] || ''
        
        // Extract contact/posting info
        const postedMatch = bodyText.match(/(?:Posted|Listed)\s*:?\s*([^\n]{1,50})/i)
        const postedText = postedMatch ? postedMatch[1].trim() : ''
        
        // Get page HTML for AI processing (truncated)
        const pageHTML = document.documentElement.outerHTML.slice(0, 5000)
        
        // Combine all image sources
        const allImages = [...imagesDom, ...imagesMeta, ...backgroundImages]
        const uniqueImages = Array.from(new Set(allImages))
        
        return { 
          title, 
          price: priceText, 
          imagesDom, 
          imagesMeta, 
          backgroundImages,
          allImages: uniqueImages,
          canonical, 
          titleMeta, 
          descriptionMeta, 
          descriptionText, 
          locationText,
          availabilityText,
          bedroomText: bedroomMatch ? bedroomMatch[1] : '',
          bathroomText: bathroomMatch ? bathroomMatch[1] : '',
          petsText,
          furnishedText,
          postedText,
          text,
          pageHTML
        }
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
        background_images: result.backgroundImages,
        all_images: result.allImages,
        canonical_url: result.canonical,
        title_meta: result.titleMeta,
        description_meta: result.descriptionMeta,
        description_text: result.descriptionText,
        location_text: result.locationText,
        availability_text: result.availabilityText,
        bedroom_text: result.bedroomText,
        bathroom_text: result.bathroomText,
        pets_text: result.petsText,
        furnished_text: result.furnishedText,
        posted_text: result.postedText
      },
      raw_text: result.text,
      raw_html: result.pageHTML
    }
    await fetch(`${apiBase}/api/ingest`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    })
  } catch (e) {
    console.error('Roof Ingest error', e)
  }
})


