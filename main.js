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

const e = type => (...elements) => {
  const y = document.createElement(type)
  for (const el of elements) {
    if (isString(el)) {
      y.appendChild(document.createTextNode(el))
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
const div = e('div')
const h1 = e('h1')
const p = e('p')
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
  const panel = document.createElement('h1')
  document.body.appendChild(panel)
  const console = {
    log: (...msgs) => {
      for (const msg of msgs) {
        panel.innerHTML += msg + '\\n'
      }
    },
  }
  const trace = tap(console.log)
  ${code}
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

// code => codeRunner
const CodeRunner = mode => pipe([
  fork({
    code: identity,
    codeArea: () => div(),
    runButton: () => button('run'),
    outputArea: () => iframe(),
  }),
  assign({
    cmInstance: ({
      codeArea, code
    }) => CodeMirror(codeArea, {
      mode, value: code,
      lineWrapping: true,
      lineNumbers: true,
    }),
    codeRunner: ({
      codeArea, runButton
    }) => div(codeArea, runButton),
  }),
  ({ code, codeArea, runButton, cmInstance, codeRunner, outputArea }) => {
    let didRenderOutputArea = false
    runButton.onclick = pipe([
      () => cmInstance.getValue(),
      transformCodeToIFrameSrc,
      iframeSrc => {
        outputArea.src = iframeSrc
        if (!didRenderOutputArea) {
          codeRunner.appendChild(outputArea)
          didRenderOutputArea = true
        }
      },
    ])
    codeRunner.refresh = cmInstance.refresh.bind(cmInstance)
    return codeRunner
  },
])

const CodeRunnerJS = CodeRunner('javascript')

const codeRunner = CodeRunnerJS(`
const square = x => x ** 2

const isOdd = x => x % 2 === 1

const add = (a, b) => a + b

const squaredOdds = pipe([
  filter(isOdd),
  map(square),
  // reduce(add), // try uncommenting this line. What does this change?
])

console.log('output:', squaredOdds([1, 2, 3, 4, 5]))
`.trim())

const appendCodeRunner = (parent, codeRunner) => {
  parent.appendChild(codeRunner)
  codeRunner.refresh() // must call this _after_ appending
}

appendCodeRunner(document.getElementById('function-composition-example'), codeRunner)
