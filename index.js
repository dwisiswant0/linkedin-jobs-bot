const jsdom = require('jsdom')
const { JSDOM } = jsdom

const file = Bun.file('log.txt')
const log = await file.text()
const w = file.writer()
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

function getValue(dom, selector, nodeType) {
  if (!nodeType) nodeType = 'textContent';
  let result = '-';

  try {
    result = dom.querySelector(selector)[nodeType].trim()
    if (nodeType == 'href') { // remove querystring
      const url = new URL(result)
      url.search = ''
      result = url.toString()
    }
  } catch(e) { /** supress **/}

  return result
}

async function getJobs(keywords) {
  const dom = await JSDOM.fromURL(`https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURI(keywords)}&location=Indonesia`)
  const { document } = dom.window
  const selector = 'body > li > div.base-card'
  const jobs = []

  document.querySelectorAll(selector).forEach(baseCard => {
    const job = {
      url: getValue(baseCard, '.base-card__full-link', 'href'),
      title: getValue(baseCard, '.base-search-card__title'),
      company_name: getValue(baseCard, '.base-search-card__subtitle'),
      company_url: getValue(baseCard, '.base-search-card__subtitle > a', 'href'),
      location: getValue(baseCard, '.job-search-card__location'),
      list_date: getValue(baseCard, '.job-search-card__listdate')
    }
    job.id = Bun.hash(job.url)

    jobs.push(job)
  })

  return jobs
}


function genPayload(data) {
  return {
    "content": "",
    "tts": false,
    "embeds": [
      {
        "description": "",
        "fields": [
          {
            "name": ":round_pushpin: Location",
            "value": data.location,
            "inline": false
          },
          {
            "name": ":calendar_spiral: List date",
            "value": data.list_date,
            "inline": false
          }
        ],
        "author": {
          "name": data.company_name,
          "url": data.company_url
        },
        "title": data.title,
        "url": data.url,
        "footer": {
          "icon_url": "https://github.com/github.png",
          "text": "dwisiswant0/linkedin-jobs-bot"
        },
        "color": 160947
      }
    ],
    "components": [],
  }
}

async function post(data) {
  const id = data.id

  if (log.includes(id)) {
    console.log(`${id} skipping...`)

    return
  }

  const payload = genPayload(data)
  const post = await fetch(Bun.env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })

  if (post.ok) {
    console.log(`${id} OK`)

    w.write(`${id}\n`)
  } else {
    console.log(post)
  }

  w.flush()
}

const keywords = [
  'application security',
  'blue team',
  'cloud security',
  'cryptography',
  'cyber risk',
  'cyber security',
  'cybersecurity',
  'devsecops',
  'endpoint security',
  'governance risk compliance',
  'grc',
  'incident response',
  'it risk',
  'it security',
  'network security',
  'penetration tester',
  'pentester',
  'purple team',
  'red team',
  'reverse engineer',
  'security architect',
  'security audit',
  'security automation',
  'security compliance',
  'security consultant',
  'security engineer',
  'security operation',
  'threat intel',
  'threat intelligence',
  'vulnerability assessment',
]

for (const keyword of keywords) {
  const jobs = await getJobs(keyword)

  for (const job of jobs) {
    await post(job)
    await delay(2500)
  }

  await delay(5000)
}