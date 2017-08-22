const EthQuery = require('eth-query')
const assert = require('assert')
const Mutex = require('await-semaphore').Mutex

class NonceTracker {

  constructor ({ provider, getPendingTransactions, getConfirmedTransactions }) {
    this.provider = provider
    this.ethQuery = new EthQuery(provider)
    this.getPendingTransactions = getPendingTransactions
    this.getConfirmedTransactions = getConfirmedTransactions
    this.lockMap = {}
  }

  async getGlobalLock () {
    const globalMutex = this._lookupMutex('global')
    // await global mutex free
    const releaseLock = await globalMutex.acquire()
    return { releaseLock }
  }

  // releaseLock must be called
  // releaseLock must be called after adding signed tx to pending transactions (or discarding)
  async getNonceLock (address) {
    // await global mutex free
    await this._globalMutexFree()
    // await lock free, then take lock
    const releaseLock = await this._takeMutex(address)
    const localNextNonce = this._getLocalNextNonce(address)
    const nonceDetails = await this._getNetworkNonceAndDetails(address)
    const networkNonce = nonceDetails.networkNonce
    const nextNonce = Math.max(networkNonce, localNextNonce)
    const currentPendingNonce = this._getLocalPendingNonce(address)
    assert(Number.isInteger(nextNonce), `nonce-tracker - nextNonce is not an integer - got: (${typeof nextNonce}) "${nextNonce}"`)
    // collect the numbers used to calculate the nonce for debugging
    nonceDetails.localNextNonce = localNextNonce
    nonceDetails.currentPendingNonce = currentPendingNonce
    // return nonce and release cb
    return { nextNonce, nonceDetails, releaseLock }
  }

  async _getCurrentBlock () {
    const blockTracker = this._getBlockTracker()
    const currentBlock = blockTracker.getCurrentBlock()
    if (currentBlock) return currentBlock
    return await Promise((reject, resolve) => {
      blockTracker.once('latest', resolve)
    })
  }

  async _getTxCount (address, currentBlock) {
    const blockNumber = currentBlock.number
    return new Promise((resolve, reject) => {
      this.ethQuery.getTransactionCount(address, blockNumber, (err, result) => {
        err ? reject(err) : resolve(result)
      })
    })
  }

  async _globalMutexFree () {
    const globalMutex = this._lookupMutex('global')
    const release = await globalMutex.acquire()
    release()
  }

  async _takeMutex (lockId) {
    const mutex = this._lookupMutex(lockId)
    const releaseLock = await mutex.acquire()
    return releaseLock
  }

  _lookupMutex (lockId) {
    let mutex = this.lockMap[lockId]
    if (!mutex) {
      mutex = new Mutex()
      this.lockMap[lockId] = mutex
    }
    return mutex
  }

  async _getNetworkNonceAndDetails (address) {
    // calculate next nonce
    // we need to make sure our base count
    // and pending count are from the same block
    const currentBlock = await this._getCurrentBlock()
    const blockNumber = currentBlock.blockNumber
    const baseCountHex = await this._getTxCount(address, currentBlock)
    const baseCount = parseInt(baseCountHex, 16)
    assert(Number.isInteger(baseCount), `nonce-tracker - baseCount is not an integer - got: (${typeof baseCount}) "${baseCount}"`)
    // if the nonce provided by the network is higher then a pending tx
    // toss out the pending txCount
    const networkNonce = baseCount

    return {networkNonce, blockNumber, baseCountHex, baseCount}
  }

  _getLocalNextNonce (address) {
    const confirmedTransactions = this._reduceTxListToUniqueNonces(this.getConfirmedTransactions(address))
    const pendingTransactions = this._reduceTxListToUniqueNonces(this.getPendingTransactions(address))
    const transactions = this._reduceTxListToUniqueNonces(confirmedTransactions.concat(pendingTransactions))
    let localNonce = this._getHighestNonce(transactions)
    // throw out localNonce if not a number
    if (!Number.isInteger(localNonce)) localNonce = 0
    if (
      // the local nonce is not 0
      localNonce ||
      // or their are pending or confirmed transactions
      this._getPendingTransactionCount(address) ||
      confirmedTransactions.length
    ) ++localNonce
    return localNonce
  }

  _getLocalPendingNonce (address) {
    const pendingTransactions = this._reduceTxListToUniqueNonces(this.getPendingTransactions(address))
    const localNonce = this._getHighestNonce(pendingTransactions)
    return localNonce
  }

  _getPendingTransactionCount (address) {
    const pendingTransactions = this.getPendingTransactions(address)
    return this._reduceTxListToUniqueNonces(pendingTransactions).length
  }


  _reduceTxListToUniqueNonces (txList) {
    const reducedTxList = txList.reduce((reducedList, txMeta, index) => {
      if (!index) return [txMeta]
      const nonceMatches = txList.filter((txData) => {
        return txMeta.txParams.nonce === txData.txParams.nonce
      })
      if (nonceMatches.length > 1) return reducedList
      reducedList.push(txMeta)
      return reducedList
    }, [])
    return reducedTxList
  }

  _getHighestNonce (txList) {
    const nonces = txList.map((txMeta) => txMeta.txParams.nonce)
    const nonceHex = nonces.reduce((highestNonce, nonce) => {
      return parseInt(nonce, 16) > parseInt(highestNonce, 16) ? nonce : highestNonce
    }, '0x0')
    return parseInt(nonceHex, 16)
  }

  // this is a hotfix for the fact that the blockTracker will
  // change when the network changes
  _getBlockTracker () {
    return this.provider._blockTracker
  }
}

module.exports = NonceTracker
