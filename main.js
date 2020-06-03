/* tour.rubico.land
 * https://github.com/a-synchronous/tour.rubico.land
 * (c) 2020 Richard Tong
 * tour.rubico.land may be freely distributed under the MIT license.
 */

'use strict'

const { pipe, fork, assign, tap, get } = rubico

// Babel.registerPlugin('@babel/plugin-transform-typescript')

const identity = x => x

const trace = tap(console.log)

const isString = x => typeof x === 'string'

const isFunction = x => typeof x === 'function'

const isPromise = x => x && typeof x.then === 'function'

/*
const Special = x => {
  return div(
    h1('yo'),
    p('hello'),
    div('aye'),
  )
}
*/

const text = document.createTextNode.bind(document)

const e = type => (...elements) => {
  const y = document.createElement(type)
  for (const el of elements) {
    if (isString(el)) {
      y.appendChild(text(el))
    } else {
      y.appendChild(el)
    }
  }
  y.pop = function() {
    this.removeChild(this.lastChild)
  }
  return y
}

// it's not all about jsx
const span = e('span')
const div = e('div')
const h1 = e('h1')
const p = e('p')
const figure = e('figure')
const button = e('button')
const iframe = e('iframe')

// (id, code) => CodeMirror
const makeCodeMirror1 = (id, code) => {
  const codemirror = CodeMirror(
    document.getElementById(id),
    { value: code, mode: 'javascript' },
  )
  codemirror.id = id
  return codemirror
}

const templateCodeSandbox = code => `
fetch('https://unpkg.com/rubico@1/index.js')
.then(res => res.text())
.then(text => {
  Function(text)()
  const {
    pipe, fork, assign,
    tap, tryCatch, switchCase,
    map, filter, reduce, transform,
    any, all, and, or, not,
    eq, gt, lt, gte, lte,
    get, pick, omit,
  } = rubico

  const codeArea = document.createElement('code')
  codeArea.style.fontSize = '1.25em'
  const panel = document.createElement('pre')
  codeArea.appendChild(panel)
  document.body.appendChild(panel)

  const fmt = x => {
    if (Array.isArray(x)) {
      return '[' + x.join(', ') + ']'
    }
    return x
  }

  const console = {
    log: (...msgs) => {
      panel.innerHTML += msgs.map(fmt).join(' ')
      panel.innerHTML += '\\n'
    },
  }

  const trace = tap(console.log)

  try {
    ${code}
  } catch (e) {
    console.log(e)
  }
})
`.trim()

// code => html_string_with_code
const generateHTMLScript = code => {
  const script = document.createElement('script')
  script.innerHTML = templateCodeSandbox(code)
  return script
}

// HTMLElement => HTMLDocument
const renderIntoNewHTMLDoc = el => {
  const html = document.createElement('html')
  const body = document.createElement('body')
  body.appendChild(el)
  html.appendChild(body)
  return html
}

// HTMLElement => html_string
const htmlToString = el => {
  const div = document.createElement('div')
  div.appendChild(el)
  return div.innerHTML
}

// code => iframeSrc
const transformCodeToIFrameSrc = pipe([
  code => Babel.transform(code, {}),
  get('code'),
  generateHTMLScript,
  renderIntoNewHTMLDoc,
  htmlToString,
  htmlString => `data:text/html;charset=utf-8,${encodeURI(htmlString)}`,
])

// https://stackoverflow.com/questions/28639142/css-creating-a-play-button/28639751
const PlayButton = () => {
  const out = figure()
  const btn = button()
  btn.name = 'play'
  out.appendChild(btn)
  return out
}

const RunButton = () => {
  const displayButton = PlayButton()
  console.log(displayButton)
  const y = div(displayButton)
  y.setOnClick = fn => {
    displayButton.onclick = () => {
      if (y.childElementCount < 2) {
        // const outputSpan = span({ text: ' >', style: { color: 'blue' } })
        const outputSpan = span(' >')
        outputSpan.style.color = '#3f72fc'
        outputSpan.style.fontSize = '.80em'
        outputSpan.style.fontWeight = '625'
        outputSpan.style.position = 'relative'
        outputSpan.style.bottom = '-1.8em'
        outputSpan.style.left = '-0.5em'
        y.appendChild(outputSpan)
      }
      fn()
    }
  }
  return y
}

// code => codeRunner
const CodeRunner = mode => pipe([
  fork({
    code: identity,
    codeArea: () => div(),
    runButton: RunButton,
    outputArea: () => iframe(),
  }),
  assign({
    cmInstance: ({
      codeArea, code
    }) => CodeMirror(codeArea, {
      mode, value: code,
      lineWrapping: true,
      lineNumbers: true,
      theme: 'default',
    }),
    codeRunner: ({
      codeArea, runButton
    }) => div(codeArea, runButton),
  }),
  ({ code, codeArea, runButton, cmInstance, codeRunner, outputArea }) => {
    let didRenderOutputArea = false
    runButton.setOnClick(pipe([
      () => cmInstance.getValue(),
      transformCodeToIFrameSrc,
      iframeSrc => {
        outputArea.src = iframeSrc
        if (!didRenderOutputArea) {
          codeRunner.appendChild(outputArea)
          didRenderOutputArea = true
        }
      },
    ]))
    codeRunner.refresh = cmInstance.refresh.bind(cmInstance)
    return codeRunner
  },
])

const CodeRunnerJS = CodeRunner('javascript')

const appendCodeRunner = (parent, codeRunner) => {
  parent.appendChild(codeRunner)
  codeRunner.refresh() // must call this _after_ appending
}

appendCodeRunner(document.getElementById('function-composition-example'), CodeRunnerJS(`
const square = x => x ** 2

const isOdd = x => x % 2 === 1

const add = (a, b) => a + b

const squaredOdds = pipe([
  filter(isOdd),
  map(square),
  // reduce(add), // try uncommenting this line. What does this change?
])

console.log('output:', squaredOdds([1, 2, 3, 4, 5]))
`.trimStart()))

/*
appendCodeRunner(document.getElementById('optional-asynchrony-example'), CodeRunnerJS(`
const getDataAsync = () => fetch(
  'https://jsonplaceholder.typicode.com/todos/1'
).then(res => res.json())

const getDataSync = () => ({ data })
`)) // TODO: finish code example here
*/
