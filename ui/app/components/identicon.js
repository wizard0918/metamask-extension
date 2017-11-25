const Component = require('react').Component
const h = require('react-hyperscript')
const inherits = require('util').inherits
const connect = require('react-redux').connect
const isNode = require('detect-node')
const findDOMNode = require('react-dom').findDOMNode
const jazzicon = require('jazzicon')
const iconFactoryGen = require('../../lib/icon-factory')
const iconFactory = iconFactoryGen(jazzicon)
const { toDataUrl } = require('../../lib/blockies')

module.exports = connect(mapStateToProps)(IdenticonComponent)

inherits(IdenticonComponent, Component)
function IdenticonComponent () {
  Component.call(this)

  this.defaultDiameter = 46
}

function mapStateToProps (state) {
  return {
    useBlockie: state.metamask.useBlockie
  }
}

IdenticonComponent.prototype.render = function () {
  var props = this.props
  const { className = '', address, useBlockie } = props
  var diameter = props.diameter || this.defaultDiameter

  return address
    ? (
      h('div', {
        className: `${className} identicon`,
        key: useBlockie ? 'blockie' : 'identicon-' + address,
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: diameter,
          width: diameter,
          borderRadius: diameter / 2,
          overflow: 'hidden',
        },
      })
    )
    : (
      h('img.balance-icon', {
        src: '../images/eth_logo.svg',
        style: {
          height: diameter,
          width: diameter,
          borderRadius: diameter / 2,
        },
      })
    )
}

IdenticonComponent.prototype.componentDidMount = function () {
  var props = this.props
  const { address, useBlockie } = props

  if (!address) return

  if (!isNode) {
    // eslint-disable-next-line react/no-find-dom-node
    var container = findDOMNode(this)

    if (useBlockie) {
      _generateBlockie(container, address)
    } else {
      const diameter = props.diameter || this.defaultDiameter
      _generateJazzicon(container, address, diameter)
    }
  }
}

IdenticonComponent.prototype.componentDidUpdate = function () {
  var props = this.props
  const { address, useBlockie } = props

  if (!address) return

  if (!isNode) {
    // eslint-disable-next-line react/no-find-dom-node
    var container = findDOMNode(this)

    var children = container.children
    for (var i = 0; i < children.length; i++) {
      container.removeChild(children[i])
    }

    if (useBlockie) {
      _generateBlockie(container, address)
    } else {
      const diameter = props.diameter || this.defaultDiameter
      _generateJazzicon(container, address, diameter)
    }
  }
}

function _generateBlockie(container, address) {
  const img = new Image()
  img.src = toDataUrl(address)
  container.appendChild(img)
}

function _generateJazzicon(container, address, diameter) {
  const img = iconFactory.iconForAddress(address, diameter)
  container.appendChild(img)
}
