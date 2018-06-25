import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Redirect } from 'react-router-dom'
import Loading from '../../loading-screen'
import {
  CONFIRM_TRANSACTION_ROUTE,
  CONFIRM_DEPLOY_CONTRACT_PATH,
  CONFIRM_SEND_ETHER_PATH,
  CONFIRM_SEND_TOKEN_PATH,
  CONFIRM_APPROVE_PATH,
  CONFIRM_TOKEN_METHOD_PATH,
  SIGNATURE_REQUEST_PATH,
} from '../../../routes'
import { isConfirmDeployContract, getTokenData } from './confirm-transaction-switch.util'
import { TOKEN_METHOD_TRANSFER, TOKEN_METHOD_APPROVE } from './confirm-transaction-switch.constants'

export default class ConfirmTransactionSwitch extends Component {
  static propTypes = {
    confirmTransaction: PropTypes.object,
  }

  redirectToTransaction (txData) {
    const { id, txParams: { data } } = txData

    if (isConfirmDeployContract(txData)) {
      const pathname = `${CONFIRM_TRANSACTION_ROUTE}/${id}${CONFIRM_DEPLOY_CONTRACT_PATH}`
      return <Redirect to={{ pathname }} />
    }

    if (data) {
      const tokenData = getTokenData(data)
      const { name: tokenMethodName } = tokenData || {}

      switch (tokenMethodName) {
        case TOKEN_METHOD_TRANSFER: {
          const pathname = `${CONFIRM_TRANSACTION_ROUTE}/${id}${CONFIRM_SEND_TOKEN_PATH}`
          return <Redirect to={{ pathname }} />
        }
        case TOKEN_METHOD_APPROVE: {
          const pathname = `${CONFIRM_TRANSACTION_ROUTE}/${id}${CONFIRM_APPROVE_PATH}`
          return <Redirect to={{ pathname }} />
        }
        default: {
          const pathname = `${CONFIRM_TRANSACTION_ROUTE}/${id}${CONFIRM_TOKEN_METHOD_PATH}`
          return <Redirect to={{ pathname }} />
        }
      }
    }

    const pathname = `${CONFIRM_TRANSACTION_ROUTE}/${id}${CONFIRM_SEND_ETHER_PATH}`
    return <Redirect to={{ pathname }} />
  }

  render () {
    const { confirmTransaction: { txData } } = this.props

    if (txData.txParams) {
      return this.redirectToTransaction(txData)
    } else if (txData.msgParams) {
      const pathname = `${CONFIRM_TRANSACTION_ROUTE}/${txData.id}${SIGNATURE_REQUEST_PATH}`
      return <Redirect to={{ pathname }} />
    }

    return <Loading />
  }
}
