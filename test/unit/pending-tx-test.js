const assert = require('assert')
const ethUtil = require('ethereumjs-util')
const EthTx = require('ethereumjs-tx')
const ObservableStore = require('obs-store')
const clone = require('clone')
const PendingTransactionWatcher = require('../../app/scripts/lib/pending-tx-watchers')
const noop = () => true
const currentNetworkId = 42
const otherNetworkId = 36
const privKey = new Buffer('8718b9618a37d1fc78c436511fc6df3c8258d3250635bba617f33003270ec03e', 'hex')

describe('PendingTransactionWatcher', function () {
  let pendingTxWatcher, txMeta, txMetaNoHash, txMetaNoRawTx
  this.timeout(10000)
  beforeEach(function () {
    txMeta = {
      id: 1,
      hash: '0x0593ee121b92e10d63150ad08b4b8f9c7857d1bd160195ee648fb9a0f8d00eebBlock',
      status: 'signed',
      txParams: {
        from: '0x1678a085c290ebd122dc42cba69373b5953b831d',
        nonce: '0x1',
        value: '0xfffff',
      },
      rawTx: '0xf86c808504a817c800827b0d940c62bb85faa3311a998d3aba8098c1235c564966880de0b6b3a7640000802aa08ff665feb887a25d4099e40e11f0fef93ee9608f404bd3f853dd9e84ed3317a6a02ec9d3d1d6e176d4d2593dd760e74ccac753e6a0ea0d00cc9789d0d7ff1f471d',
    }
    txMetaNoHash = {
      id: 2,
      status: 'signed',
      txParams: { from: '0x1678a085c290ebd122dc42cba69373b5953b831d'},
    }
    txMetaNoRawTx = {
      hash: '0x0593ee121b92e10d63150ad08b4b8f9c7857d1bd160195ee648fb9a0f8d00eebBlock',
      status: 'signed',
      txParams: { from: '0x1678a085c290ebd122dc42cba69373b5953b831d'},
    }

    pendingTxWatcher = new PendingTransactionWatcher({
      provider: { sendAsync: noop },
      getBalance: () => {},
      nonceTracker: {
        getGlobalLock: async () => {
          return { releaseLock: () => {} }
        }
      },
      getPendingTransactions: () => {return []},
      sufficientBalance: () => {},
      publishTransaction: () => {},
    })

    pendingTxWatcher.query = new Proxy({}, {
      get: (queryStubResult, key) => {
        if (key === 'stubResult') {
          return function (method, ...args) {
            queryStubResult[method] = args
          }
        } else {
          const returnValues = queryStubResult[key]
          return () => Promise.resolve(...returnValues)
        }
      },
    })

  })

  describe('#checkForTxInBlock', function () {
    it('should return if no pending transactions', function () {
      // throw a type error if it trys to do anything on the block
      // thus failing the test
      const block = Proxy.revocable({}, {}).revoke()
      pendingTxWatcher.checkForTxInBlock(block)
    })
    it('should emit \'txFailed\' if the txMeta does not have a hash', function (done) {
      const block = Proxy.revocable({}, {}).revoke()
      pendingTxWatcher.getPendingTransactions = () => [txMetaNoHash]
      pendingTxWatcher.once('txFailed', (txId, err) => {
        assert(txId, txMetaNoHash.id, 'should pass txId')
        done()
      })
      pendingTxWatcher.checkForTxInBlock(block)
    })
    it('should emit \'txConfirmed\' if the tx is in the block', function (done) {
      const block = { transactions: [txMeta]}
      pendingTxWatcher.getPendingTransactions = () => [txMeta]
      pendingTxWatcher.once('txConfirmed', (txId) => {
        assert(txId, txMeta.id, 'should pass txId')
        done()
      })
      pendingTxWatcher.once('txFailed', (_, err) => { done(err) })
      pendingTxWatcher.checkForTxInBlock(block)
    })
  })
  describe('#queryPendingTxs', function () {
    it('should call #_checkPendingTxs if their is no oldBlock', function (done) {
      let newBlock, oldBlock
      newBlock = { number: '0x01' }
      pendingTxWatcher._checkPendingTxs = done
      pendingTxWatcher.queryPendingTxs({oldBlock, newBlock})
    })
    it('should call #_checkPendingTxs if oldBlock and the newBlock have a diff of greater then 1', function (done) {
      let newBlock, oldBlock
      oldBlock = { number: '0x01' }
      newBlock = { number: '0x03' }
      pendingTxWatcher._checkPendingTxs = done
      pendingTxWatcher.queryPendingTxs({oldBlock, newBlock})
    })
    it('should not call #_checkPendingTxs if oldBlock and the newBlock have a diff of 1 or less', function (done) {
      let newBlock, oldBlock
      oldBlock = { number: '0x1' }
      newBlock = { number: '0x2' }
      pendingTxWatcher._checkPendingTxs = () => {
        const err = new Error('should not call #_checkPendingTxs if oldBlock and the newBlock have a diff of 1 or less')
        done(err)
      }
      pendingTxWatcher.queryPendingTxs({oldBlock, newBlock})
      done()
    })
  })

  describe('#_checkPendingTx', function () {
    it('should emit \'txFailed\' if the txMeta does not have a hash', function (done) {
      pendingTxWatcher.once('txFailed', (txId, err) => {
        assert(txId, txMetaNoHash.id, 'should pass txId')
        done()
      })
      pendingTxWatcher._checkPendingTx(txMetaNoHash)
    })

    it('should should return if query does not return txParams', function () {
      pendingTxWatcher.query.stubResult('getTransactionByHash', null)
      pendingTxWatcher._checkPendingTx(txMeta)
    })

    it('should emit \'txConfirmed\'', function (done) {
      pendingTxWatcher.query.stubResult('getTransactionByHash', {blockNumber: '0x01'})
      pendingTxWatcher.once('txConfirmed', (txId) => {
        assert(txId, txMeta.id, 'should pass txId')
        done()
      })
      pendingTxWatcher.once('txFailed', (_, err) => { done(err) })
      pendingTxWatcher._checkPendingTx(txMeta)
    })
  })

  describe('#_checkPendingTxs', function () {
    beforeEach(function () {
      const txMeta2 = txMeta3 = txMeta
      txMeta2.id = 2
      txMeta3.id = 3
      txList = [txMeta, txMeta2, txMeta3].map((tx) => {
        tx.processed = new Promise ((resolve) => { tx.resolve = resolve })
        return tx
      })
    })

    it('should warp all txMeta\'s in #_checkPendingTx', function (done) {
      pendingTxWatcher.getPendingTransactions = () => txList
      pendingTxWatcher._checkPendingTx = (tx) => { tx.resolve(tx) }
      const list = txList.map
      Promise.all(txList.map((tx) => tx.processed))
      .then((txCompletedList) => done())
      .catch(done)

      pendingTxWatcher._checkPendingTxs()
    })
  })

  describe('#resubmitPendingTxs', function () {
    beforeEach(function () {
    const txMeta2 = txMeta3 = txMeta
    txList = [txMeta, txMeta2, txMeta3].map((tx) => {
        tx.processed = new Promise ((resolve) => { tx.resolve = resolve })
        return tx
      })
    })

    it('should return if no pending transactions', function () {
      pendingTxWatcher.resubmitPendingTxs()
    })
    it('should call #_resubmitTx for all pending tx\'s', function (done) {
      pendingTxWatcher.getPendingTransactions = () => txList
      pendingTxWatcher._resubmitTx = async (tx) => { tx.resolve(tx) }
      Promise.all(txList.map((tx) => tx.processed))
      .then((txCompletedList) => done())
      .catch(done)
      pendingTxWatcher.resubmitPendingTxs()
    })
    it('should not emit \'txFailed\' if the txMeta throws a known txError', function (done) {
      knownErrors =[
        // geth
        '     Replacement transaction Underpriced            ',
        '       known transaction',
        // parity
        'Gas price too low to replace     ',
        '     transaction with the sAme hash was already imported',
        // other
        '       gateway timeout',
        '         noncE too low       ',
      ]
      const enoughForAllErrors = txList.concat(txList)

      pendingTxWatcher.on('txFailed', (_, err) => done(err))

      pendingTxWatcher.getPendingTransactions = () => enoughForAllErrors
      pendingTxWatcher._resubmitTx = async (tx) => {
        tx.resolve()
        throw new Error(knownErrors.pop())
      }
      Promise.all(txList.map((tx) => tx.processed))
      .then((txCompletedList) => done())
      .catch(done)

      pendingTxWatcher.resubmitPendingTxs()
    })
    it('should emit \'txFailed\' if it encountered a real error', function (done) {
      pendingTxWatcher.once('txFailed', (id, err) => err.message === 'im some real error' ? txList[id - 1].resolve() : done(err))

      pendingTxWatcher.getPendingTransactions = () => txList
      pendingTxWatcher._resubmitTx = async (tx) => { throw new TypeError('im some real error') }
      Promise.all(txList.map((tx) => tx.processed))
      .then((txCompletedList) => done())
      .catch(done)

      pendingTxWatcher.resubmitPendingTxs()
    })
  })
  describe('#_resubmitTx with a too-low balance', function () {
    it('should return before publishing the transaction because to low of balance', function (done) {
    const lowBalance = '0x0'
    pendingTxWatcher.getBalance = (address) => {
      assert.equal(address, txMeta.txParams.from, 'Should pass the address')
      return lowBalance
    }
    pendingTxWatcher.publishTransaction = async (rawTx) => {
      done(new Error('tried to publish transaction'))
    }

    // Stubbing out current account state:
    // Adding the fake tx:
    pendingTxWatcher.once('txWarning', (txMeta) => {
      assert(txMeta.warning.message, 'Should have a warning message')
      done()
    })
    pendingTxWatcher._resubmitTx(txMeta)
    .catch((err) => {
     assert.ifError(err, 'should not throw an error')
     done(err)
    })
  })

    it('should publishing the transaction', function (done) {
    const enoughBalance = '0x100000'
    pendingTxWatcher.getBalance = (address) => {
      assert.equal(address, txMeta.txParams.from, 'Should pass the address')
      return enoughBalance
    }
    pendingTxWatcher.publishTransaction = async (rawTx) => {
      assert.equal(rawTx, txMeta.rawTx, 'Should pass the rawTx')
    }

    // Stubbing out current account state:
    // Adding the fake tx:
    pendingTxWatcher._resubmitTx(txMeta)
    .then(() => done())
    .catch((err) => {
     assert.ifError(err, 'should not throw an error')
     done(err)
    })
  })
 })
})