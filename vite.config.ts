import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'
import { URL } from 'url'

function gstLookupPlugin(): Plugin {
  const handleRequest = async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    if (!req.url?.startsWith('/api/gst-lookup')) return false

    const parsedUrl = new URL(req.url, 'http://localhost')
    const gstin = (parsedUrl.searchParams.get('gstin') || '').trim().toUpperCase()

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

    if (req.method === 'OPTIONS') {
      res.statusCode = 200
      res.end()
      return true
    }

    if (!gstin || gstin.length !== 15) {
      res.statusCode = 400
      res.end(JSON.stringify({ success: false, message: 'Valid 15-digit GSTIN is required' }))
      return true
    }

    const pan = gstin.slice(2, 12)

    // 1. Query MastersIndia live GSTN search by GSTIN
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const mRes = await fetch(
        `https://blog-backend.mastersindia.co/api/v1/custom/search/name_and_pan/?keyword=${encodeURIComponent(gstin)}+`,
        {
          headers: {
            Origin: 'https://www.mastersindia.co',
            Referer: 'https://www.mastersindia.co/gst-number-search-by-name-and-pan/',
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          signal: controller.signal,
        }
      )
      clearTimeout(timeout)
      const mData = (await mRes.json()) as any

      if (mData.success && Array.isArray(mData.data) && mData.data.length > 0) {
        const item = mData.data.find((x: any) => x.gstin === gstin) || mData.data[0]
        const addr = item.pradr?.addr || {}

        const addrParts = [
          addr.bno && addr.bno !== '0' ? `Door/Plot ${addr.bno}` : '',
          addr.bnm,
          addr.st,
          addr.locality,
          addr.landMark ? `Near ${addr.landMark}` : '',
        ].filter(Boolean)

        const streetAddr = addrParts.join(', ') || addr.st || addr.locality || ''
        const city = addr.dst || addr.loc || item.stj || ''
        const state = addr.stcd || ''
        const pincode = addr.pncd || ''

        res.statusCode = 200
        res.end(
          JSON.stringify({
            success: true,
            isValid: true,
            gstin: item.gstin || gstin,
            status: item.sts === 'Active' ? 'ACTIVE' : item.sts?.toUpperCase() || 'ACTIVE',
            legalName: item.lgnm || '',
            tradeName: item.tradeNam || item.lgnm || '',
            pan: pan,
            taxpayerType: item.dty || 'Regular',
            constitution: item.ctb || 'Proprietorship',
            state: state,
            stateCode: gstin.slice(0, 2),
            city: city,
            pincode: pincode,
            address: streetAddr,
            fullAddress: [streetAddr, city, state, pincode].filter(Boolean).join(', '),
            registrationDate: item.rgdt || '',
            source: 'live_gstn_masters',
          })
        )
        return true
      }
    } catch (err: any) {
      console.warn('[GST Lookup] MastersIndia GSTIN query error:', err?.message || err)
    }

    // 2. Query MastersIndia live GSTN search by PAN
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const mRes = await fetch(
        `https://blog-backend.mastersindia.co/api/v1/custom/search/name_and_pan/?keyword=${encodeURIComponent(pan)}+`,
        {
          headers: {
            Origin: 'https://www.mastersindia.co',
            Referer: 'https://www.mastersindia.co/gst-number-search-by-name-and-pan/',
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          signal: controller.signal,
        }
      )
      clearTimeout(timeout)
      const mData = (await mRes.json()) as any

      if (mData.success && Array.isArray(mData.data) && mData.data.length > 0) {
        const item = mData.data.find((x: any) => x.gstin === gstin) || mData.data[0]
        const addr = item.pradr?.addr || {}

        const addrParts = [
          addr.bno && addr.bno !== '0' ? `Door/Plot ${addr.bno}` : '',
          addr.bnm,
          addr.st,
          addr.locality,
          addr.landMark ? `Near ${addr.landMark}` : '',
        ].filter(Boolean)

        const streetAddr = addrParts.join(', ') || addr.st || addr.locality || ''
        const city = addr.dst || addr.loc || item.stj || ''
        const state = addr.stcd || ''
        const pincode = addr.pncd || ''

        res.statusCode = 200
        res.end(
          JSON.stringify({
            success: true,
            isValid: true,
            gstin: item.gstin || gstin,
            status: item.sts === 'Active' ? 'ACTIVE' : item.sts?.toUpperCase() || 'ACTIVE',
            legalName: item.lgnm || '',
            tradeName: item.tradeNam || item.lgnm || '',
            pan: pan,
            taxpayerType: item.dty || 'Regular',
            constitution: item.ctb || 'Proprietorship',
            state: state,
            stateCode: gstin.slice(0, 2),
            city: city,
            pincode: pincode,
            address: streetAddr,
            fullAddress: [streetAddr, city, state, pincode].filter(Boolean).join(', '),
            registrationDate: item.rgdt || '',
            source: 'live_gstn_masters_pan',
          })
        )
        return true
      }
    } catch (err: any) {
      console.warn('[GST Lookup] MastersIndia PAN query error:', err?.message || err)
    }

    // 3. Fallback to Razorpay public GST enrichment API
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 6000)
      const rRes = await fetch(`https://razorpay.com/api/gstin/${encodeURIComponent(gstin)}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const rData = (await rRes.json()) as any
      const details = rData?.enrichment_details?.online_provider?.details

      if (details && (details.legal_name?.value || details.trade_name?.value || details.status?.value)) {
        const legal = details.legal_name?.value || ''
        const trade = details.trade_name?.value || legal
        const city = details.state_jurisdiction?.value || ''

        res.statusCode = 200
        res.end(
          JSON.stringify({
            success: true,
            isValid: true,
            gstin: gstin,
            status: details.status?.value?.toUpperCase() || 'ACTIVE',
            legalName: legal,
            tradeName: trade,
            pan: pan,
            taxpayerType: details.tax_payer_type?.value || 'Regular',
            constitution: details.constitution?.value || 'Proprietorship',
            state: '',
            stateCode: gstin.slice(0, 2),
            city: city,
            pincode: '',
            address: '',
            fullAddress: city,
            registrationDate: details.registration_date?.value?.split('T')[0] || '',
            source: 'live_gstn_razorpay',
          })
        )
        return true
      }
    } catch (err: any) {
      console.warn('[GST Lookup] Razorpay query error:', err?.message || err)
    }

    res.statusCode = 404
    res.end(
      JSON.stringify({
        success: false,
        isValid: false,
        message: 'No live record found for this GSTIN in public GST portal.',
      })
    )
    return true
  }

  return {
    name: 'gst-lookup-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const handled = await handleRequest(req, res)
        if (!handled) next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const handled = await handleRequest(req, res)
        if (!handled) next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), gstLookupPlugin()],
})
