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

const templateCodeSandbox = code => `
Promise.all([
  fetch('https://unpkg.com/rubico@1/index.js').then(res => res.text()),
]).then(texts => {
  texts.forEach(text => { Function(text)() })

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

  const isDefined = x => x !== null && x !== undefined

  const isString = x => typeof x === 'string'

  const isArray = Array.isArray

  const is = fn => x => isDefined(x) && x.constructor === fn

  const typedArrays = new Set([
    'Uint8ClampedArray',
    'Uint8Array', 'Int8Array',
    'Uint16Array', 'Int16Array',
    'Uint32Array', 'Int32Array',
    'Float32Array', 'Float64Array',
    'BigUint64Array', 'BigInt64Array',
  ])

  const isTypedArray = x => (isDefined(x) &&
    x.constructor && typedArrays.has(x.constructor.name))

  const fmt = (x, depth = 0) => {
    if (depth > 0 && isString(x)) {
      return "'" + x + "'"
    }
    if (isArray(x)) {
      return '[' + map(xi => fmt(xi, depth + 1))(x).join(', ') + ']'
    }
    if (isTypedArray(x)) {
      return x.constructor.name + '(' + x.length + ') [' + x.join(', ') + ']'
    }
    if (is(Object)(x)) {
      let y = '{ '
      const entries = []
      for (const k in x) entries.push(k + ': ' + fmt(x[k], depth + 1))
      y += entries.join(', ')
      y += ' }'
      return y
    }
    if (is(Set)(x)) {
      return 'Set { ' + [...map(xi => fmt(xi, depth + 1))(x)].join(', ') + ' }'
    }
    if (is(Map)(x)) {
      let y = 'Map { '
      const entries = []
      for (const [k, v] of x) entries.push(k + ' => ' + fmt(v, depth + 1))
      y += entries.join(', ')
      y += ' }'
      return y
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
  // const displayButton = PlayButton()
  const displayButton = button('run')
  displayButton.style.padding = '.25em .75em'
  displayButton.style.borderRadius = '2px'
  displayButton.style.cursor = 'pointer'
  displayButton.style.height = '2em'
  const y = div(displayButton)
  y.style.display = 'grid'
  y.style.gridTemplateColumns = '3em 1em auto'
  y.style.height = '10em'
  y.setOnClick = fn => {
    displayButton.onclick = () => {
      if (y.childElementCount < 2) {
        const caret = span(' >')
        caret.style.color = '#3f72fc'
        caret.style.fontSize = '.80em'
        caret.style.fontWeight = '625'
        caret.style.position = 'relative'
        caret.style.right = '-0.75em'
        caret.style.bottom = '-0.65em'
        y.appendChild(caret)
      }
      fn()
    }
  }
  return y
}

const OutputArea = () => {
  const ifr = iframe()
  ifr.style.height = '10em'
  ifr.style.position = 'relative'
  ifr.style.bottom = '-0.05em'
  return ifr
}

// code => codeRunner
const CodeRunner = mode => pipe([
  fork({
    code: identity,
    codeArea: () => div(),
    runButton: RunButton,
    outputArea: OutputArea,
  }),
  assign({
    cmInstance: ({
      codeArea, code
    }) => CodeMirror(codeArea, {
      mode, value: code,
      lineWrapping: true,
      lineNumbers: true,
      theme: 'default',
      // theme: 'base16-dark',
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
          // codeRunner.appendChild(outputArea)
          runButton.appendChild(outputArea)
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

appendCodeRunner(document.getElementById('a-synchrony-example'), CodeRunnerJS(`
const todoIDs = [1, 2, 3, 4, 5] // try adding 6 to this array

const getTodo = id => fetch('https://jsonplaceholder.typicode.com/todos/' + id)

map(pipe([
  getTodo,
  res => res.json(),
  trace,
]))(todoIDs)
`.trimStart()))

appendCodeRunner(document.getElementById('pipelines-example'), CodeRunnerJS(`
const numbers = [1, 2, 3, 4, 5]

const square = x => x ** 2

const isOdd = x => x % 2 === 1

const add = (a, b) => a + b

const squaredOdds = pipe([
  filter(isOdd),
  map(square),
  // trace,
  // reduce(add), // try uncommenting this reduce statement
])

console.log('input:', numbers)

const output = squaredOdds(numbers)

console.log('output:', output)
`.trimStart()))

appendCodeRunner(document.getElementById('shaping-data-example'), CodeRunnerJS(`
const identity = x => x

const square = x => x ** 2

const double = x => x * 2

const doMaths = pipe([
  fork({
    original: identity,
    resultOfDouble: double,
    resultOfSquare: square,
  }),
  /* try uncommenting this block
  assign({
    total: pipe([
      fork([
        get('original'),
        get('resultOfDouble'),
        get('resultOfSquare'),
      ]),
      ([original, resultOfDouble, resultOfSquare]) => original + resultOfDouble + resultOfSquare,
    ]),
  }),
  */
])

const result = doMaths(3)

console.log('maths:', result)
`.trimStart()))

appendCodeRunner(document.getElementById('polymorphism-example'), CodeRunnerJS(`
const iterables = [
  [1, 2, 3, 4, 5],
  '12345',
  new Set([1, 2, 3, 4, 5]),
  new Uint8Array([1, 2, 3, 4, 5]),
  { a: 1, b: 2, c: 3, d: 4, e: 5 },
  // new Map([[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]]), // try uncommenting this. Why does this break?
]

const identity = x => x

const square = x => {
  // if (Array.isArray(x)) return [x[0] ** 2, x[1] ** 2] // this may fix the issue
  return x ** 2
}

const squareAndCompare = map(pipe([
  fork({
    original: identity,
    squared: map(square),
  }),
  trace,
]))

squareAndCompare(iterables)
`.trimStart()))

appendCodeRunner(document.getElementById('control-flow-example'), CodeRunnerJS(`
const numbers = [1, 2, 3, 4, 5]

const identity = x => x

const isOdd = x => x % 2 === 1

map(pipe([
  fork({
    number: identity,
    isEven: not(isOdd),
    message: switchCase([
      isOdd, () => 'I\\'m odd!',
      () => 'I\\'m even.',
    ]),
    // greaterThan3: gt(identity, 3),
  }),
  trace,
]))(numbers)
`.trimStart()))
