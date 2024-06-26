const { withFixtures } = require('../helpers');
const FixtureBuilder = require('../fixture-builder');
const { TEST_SNAPS_WEBSITE_URL } = require('./enums');

describe('Test Snap revoke permission', function () {
  it('can revoke a permission', async function () {
    const ganacheOptions = {
      accounts: [
        {
          secretKey:
            '0x7C9529A67102755B7E6102D6D950AC5D5863C98713805CEC576B945B15B71EAC',
          balance: 25000000000000000000,
        },
      ],
    };
    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        ganacheOptions,
        failOnConsoleError: false,
        title: this.test.title,
      },
      async ({ driver }) => {
        await driver.navigate();

        // enter pw into extension
        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);

        // navigate to test snaps page and connect
        await driver.openNewPage(TEST_SNAPS_WEBSITE_URL);
        await driver.delay(1000);
        const snapButton = await driver.findElement(
          '#connectethereum-provider',
        );
        await driver.scrollToElement(snapButton);
        await driver.delay(1000);
        await driver.clickElement('#connectethereum-provider');
        await driver.delay(1000);

        // switch to metamask extension and click connect
        const windowHandles = await driver.waitUntilXWindowHandles(
          3,
          1000,
          10000,
        );
        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles,
        );
        await driver.clickElement({
          text: 'Connect',
          tag: 'button',
        });

        await driver.waitForSelector({ text: 'Install' });

        await driver.clickElement({
          text: 'Install',
          tag: 'button',
        });

        await driver.waitForSelector({ text: 'OK' });

        await driver.clickElement({
          text: 'OK',
          tag: 'button',
        });

        // switch to test snap page
        await driver.switchToWindowWithTitle('Test Snaps', windowHandles);

        // wait for npm installation success
        await driver.waitForSelector({
          css: '#connectethereum-provider',
          text: 'Reconnect to Ethereum Provider Snap',
        });

        // find and click on send get version
        const snapButton3 = await driver.findElement(
          '#sendEthproviderAccounts',
        );
        await driver.scrollToElement(snapButton3);
        await driver.delay(500);
        await driver.clickElement('#sendEthproviderAccounts');

        // switch to metamask window and click through confirmations
        const windowHandles2 = await driver.waitUntilXWindowHandles(
          3,
          1000,
          10000,
        );
        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles2,
        );
        await driver.clickElement({
          text: 'Next',
          tag: 'button',
        });
        await driver.delay(500);
        await driver.clickElement({
          text: 'Connect',
          tag: 'button',
        });

        // switch to test snap page
        await driver.switchToWindowWithTitle('Test Snaps', windowHandles);

        // check the results of the message signature using waitForSelector
        await driver.waitForSelector({
          css: '#ethproviderResult',
          text: '"0x5cfe73b6021e818b776b421b1c4db2474086a7e1"',
        });

        // switch to the original MM tab
        const extensionPage = windowHandles[0];
        await driver.switchToWindow(extensionPage);
        await driver.delay(1000);

        // click on the global action menu
        await driver.clickElement(
          '[data-testid="account-options-menu-button"]',
        );

        // try to click on the notification item
        await driver.clickElement({ text: 'Settings', tag: 'div' });
        await driver.delay(1000);

        // try to click on the snaps item
        await driver.clickElement({
          text: 'Snaps',
          tag: 'div',
        });

        // try to click on the Ethereum Provider Example Snap
        await driver.clickElement({
          text: 'Ethereum Provider Example Snap',
          tag: 'p',
        });

        // try to click on options menu
        await driver.clickElement('[data-testid="eth_accounts"]');

        // try to click on revoke permission
        await driver.clickElement({
          text: 'Revoke permission',
          tag: 'p',
        });

        // switch to test snap page
        await driver.switchToWindowWithTitle('Test Snaps', windowHandles);

        // find and click on send get version
        const snapButton4 = await driver.findElement(
          '#sendEthproviderAccounts',
        );
        await driver.scrollToElement(snapButton4);
        await driver.delay(500);
        await driver.clickElement('#sendEthproviderAccounts');

        // switch to metamask window and click through confirmations
        const windowHandles3 = await driver.waitUntilXWindowHandles(
          3,
          1000,
          10000,
        );
        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles3,
        );
        await driver.clickElement({
          text: 'Next',
          tag: 'button',
        });
        await driver.delay(500);
        await driver.clickElement({
          text: 'Connect',
          tag: 'button',
        });

        // switch to test snap page
        await driver.switchToWindowWithTitle('Test Snaps', windowHandles);

        // check the results of the message signature using waitForSelector
        await driver.waitForSelector({
          css: '#ethproviderResult',
          text: '"0x5cfe73b6021e818b776b421b1c4db2474086a7e1"',
        });
      },
    );
  });
});
