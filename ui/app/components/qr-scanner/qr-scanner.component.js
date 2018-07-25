import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import { hideQrScanner, qrCodeDetected} from '../../actions'
import Instascan from 'instascan'
import Spinner from '../spinner'

class QrScanner extends Component {
  static propTypes = {
    visible: PropTypes.bool,
    hideQrScanner: PropTypes.func,
    qrCodeDetected: PropTypes.func,
  }
  constructor (props) {
    super(props)
    this.state = {
      ready: false,
      msg: 'Accesing your camera...',
    }
    this.scanning = false
  }

  componentDidUpdate () {
    if (this.props.visible && this.camera && !this.scanning) {
      this.scanner = new Instascan.Scanner({
        video: this.camera,
        backgroundScan: false,
        continuous: true,
      })
      this.scanner.addListener('scan', (content) => {
        this.scanner.stop().then(_ => {
          const result = this.parseContent(content)
          if (result.type !== 'unknown') {
            console.log('QR-SCANNER: CODE DETECTED', result)
            this.props.qrCodeDetected(result)
            this.props.hideQrScanner()
            this.setState({ ready: false })
          } else {
            this.setState({msg: 'Error: We couldn\'t identify that QR code'})
          }
          this.scanning = false
        })
      })
      Instascan.Camera.getCameras().then((cameras) => {
        if (cameras.length > 0) {
          this.scanner.start(cameras[0])
          setTimeout(_ => {
            this.setState({
              ready: true,
              msg: 'Place the QR code in front of your camera so we can read it...'})
          }, 2000)
          console.log('QR-SCANNER: started scanning with camera', cameras[0])
        } else {
          this.setState({ msg: 'No camera found :('})
        }
      }).catch(function (e) {
        console.error(e)
      })
      this.scanning = true
    }
  }

  parseContent (content) {
    let type = 'unknown'
    let values = {}

    // Here we could add more cases
    // To parse other codes (transactions for ex.)

    if (content.split('ethereum:').length > 1) {
      type = 'address'
      values = {'address': content.split('ethereum:')[1] }
    }
    return {type, values}
  }


  stopAndClose = () => {
    this.scanner.stop().then(_ => {
      this.scanning = false
      this.props.hideQrScanner()
      this.setState({ ready: false })
    })
  }

  render () {
    const { visible } = this.props

    if (!visible) {
     return null
    }

    return (
      <div className={'qr-code-modal-wrapper'}>
        <div className={'qr-scanner'}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            zIndex: 1050,
            minWidth: '320px',
            minHeight: '400px',
            maxWidth: '300px',
            maxHeight: '300px',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#ffffff',
            padding: '15px',
          }}
        >
          <h3 style={{
            textAlign: 'center',
            marginBottom: '20px',
            fontSize: '1.5rem',
            fontWeight: '500',
          }}>
            Scan QR code
          </h3>
            <div
              className={'qr-code-video-wrapper'}
              style={{
                overflow: 'hidden',
                width: '100%',
                height: '275px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <video
                style={{
                  width: 'auto',
                  height: '275px',
                  marginLeft: '-15%',
                  display: this.state.ready ? 'block' : 'none',
                }}
                ref={(cam) => {
                  this.camera = cam
                }}
              />
             { !this.state.ready ? <Spinner color={'#F7C06C'} /> : null}
            </div>
          <div className={'qr-code-help'} style={{textAlign: 'center', fontSize: '12px', padding: '15px'}}>
            {this.state.msg}
          </div>
        </div>
        <div
          className={'qr-code-modal-overlay'}
          style={{
            position: 'fixed',
            top: '0',
            right: '0',
            bottom: '0',
            left: '0',
            zIndex: '1040',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            animationFillMode: 'forwards',
            animationDuration: '0.3s',
            animationName: 'anim_171532470906313',
            animationTimingFunction: 'ease-out',
          }}
          onClick={this.stopAndClose}
        />
      </div>
    )
  }
}

function mapDispatchToProps (dispatch) {
  return {
    hideQrScanner: () => dispatch(hideQrScanner()),
    qrCodeDetected: (data) => dispatch(qrCodeDetected(data)),
  }
}
function mapStateToProps (state) {
  return {}
}

export default connect(mapStateToProps, mapDispatchToProps)(QrScanner)
