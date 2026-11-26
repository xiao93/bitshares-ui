/**
 * Operation 63 parser check.
 *
 * Fixtures are the liquidity_pool_exchange operations from BitShares mainnet
 * block 116427435, transaction index 1 (the block page
 * /#/block/116427435/1). get_block on public nodes returns an empty
 * operation_results array for that transaction, so the block view has to
 * render the operation body. The history result fixture is a separate
 * generic_exchange_operation_result (result id 4) returned by
 * history_api.get_account_history for the same operation type.
 *
 * Run: node app/test/liquidityPoolExchange.js
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const source = fs.readFileSync(
    path.join(__dirname, "../lib/common/operationNames.js"),
    "utf8"
);
const transformed =
    source.replace(/^export /gm, "") +
    "\nmodule.exports = {LIQUIDITY_POOL_EXCHANGE_ID, buildOperationNames, describeLiquidityPoolExchange, liquidityPoolExchangeSummary, liquidityPoolExchangeRows};";
const loaded = {exports: {}};
const runner = new Function("module", "exports", transformed);
runner(loaded, loaded.exports);

const {
    LIQUIDITY_POOL_EXCHANGE_ID,
    buildOperationNames,
    describeLiquidityPoolExchange,
    liquidityPoolExchangeSummary,
    liquidityPoolExchangeRows
} = loaded.exports;

const blockTx1 = {
    operations: [
        [
            1,
            {
                fee: {amount: 48260, asset_id: "1.3.0"},
                seller: "1.2.883283",
                amount_to_sell: {amount: 17973986, asset_id: "1.3.0"},
                min_to_receive: {amount: 114245, asset_id: "1.3.113"},
                expiration: "2027-11-25T20:34:15",
                fill_or_kill: true,
                extensions: {}
            }
        ],
        [
            63,
            {
                fee: {amount: 100000, asset_id: "1.3.0"},
                account: "1.2.883283",
                pool: "1.19.23",
                amount_to_sell: {amount: 114108, asset_id: "1.3.113"},
                min_to_receive: {amount: 855, asset_id: "1.3.120"},
                extensions: []
            }
        ],
        [
            63,
            {
                fee: {amount: 100000, asset_id: "1.3.0"},
                account: "1.2.883283",
                pool: "1.19.59",
                amount_to_sell: {amount: 855, asset_id: "1.3.120"},
                min_to_receive: {amount: 18031226, asset_id: "1.3.0"},
                extensions: []
            }
        ]
    ],
    operation_results: []
};

const historyResult = [
    4,
    {
        paid: [{amount: 948275, asset_id: "1.3.5589"}],
        received: [{amount: 2181269, asset_id: "1.3.4159"}],
        fees: [
            {amount: 758, asset_id: "1.3.5589"},
            {amount: 2183, asset_id: "1.3.4159"},
            {amount: 6570, asset_id: "1.3.4159"}
        ]
    }
];

function testNameMapping() {
    const base = [];
    for (let i = 0; i < 58; i++) {
        base.push("op_" + i);
    }
    base.push("ticket_update");

    const names = buildOperationNames(base);
    assert.strictEqual(names.length, 78);
    assert.strictEqual(names[0], "op_0");
    assert.strictEqual(names[57], "op_57");
    assert.strictEqual(names[58], "ticket_update");
    assert.strictEqual(names[59], "liquidity_pool_create");
    assert.strictEqual(names[63], "liquidity_pool_exchange");
    assert.strictEqual(names[64], "samet_fund_create");
    assert.strictEqual(names[76], "credit_deal_update");
    assert.strictEqual(names[77], "limit_order_update");
    assert.strictEqual(LIQUIDITY_POOL_EXCHANGE_ID, 63);

    const alreadyNamed = ["transfer"];
    alreadyNamed[63] = "liquidity_pool_exchange";
    assert.strictEqual(
        buildOperationNames(alreadyNamed)[63],
        "liquidity_pool_exchange"
    );
    assert.strictEqual(buildOperationNames(alreadyNamed)[0], "transfer");
}

function testBlockTransaction() {
    assert.strictEqual(blockTx1.operation_results.length, 0);

    const first = describeLiquidityPoolExchange(
        blockTx1.operations[1],
        blockTx1.operation_results[1]
    );
    assert.strictEqual(first.account, "1.2.883283");
    assert.strictEqual(first.pool, "1.19.23");
    assert.strictEqual(first.amountToSell.amount, 114108);
    assert.strictEqual(first.amountToSell.asset_id, "1.3.113");
    assert.strictEqual(first.minToReceive.amount, 855);
    assert.strictEqual(first.minToReceive.asset_id, "1.3.120");
    assert.strictEqual(first.fee.amount, 100000);
    assert.strictEqual(first.fee.asset_id, "1.3.0");
    assert.strictEqual(first.paid, null);
    assert.strictEqual(first.received, null);

    const firstSummary = liquidityPoolExchangeSummary(
        blockTx1.operations[1],
        undefined
    );
    assert.strictEqual(
        firstSummary.stringKey,
        "operation.liquidity_pool_exchange_limit"
    );
    assert.strictEqual(firstSummary.amountA.amount, 114108);
    assert.strictEqual(firstSummary.amountB.amount, 855);
    assert.strictEqual(firstSummary.pool, "1.19.23");

    const firstRows = liquidityPoolExchangeRows(blockTx1.operations[1], undefined);
    assert.deepStrictEqual(firstRows.map(row => row.label), [
        "header.account",
        "explorer.block.liquidity_pool",
        "exchange.sell",
        "transaction.min_receive",
        "exchange.price"
    ]);
    assert.strictEqual(firstRows[1].value, "1.19.23");
    assert.strictEqual(firstRows[2].value.asset_id, "1.3.113");
    assert.strictEqual(firstRows[3].value.asset_id, "1.3.120");
    assert.strictEqual(firstRows[4].base.amount, 114108);
    assert.strictEqual(firstRows[4].quote.amount, 855);

    const second = describeLiquidityPoolExchange(blockTx1.operations[2], null);
    assert.strictEqual(second.pool, "1.19.59");
    assert.strictEqual(second.amountToSell.amount, 855);
    assert.strictEqual(second.amountToSell.asset_id, "1.3.120");
    assert.strictEqual(second.minToReceive.amount, 18031226);
    assert.strictEqual(second.minToReceive.asset_id, "1.3.0");

    assert.strictEqual(
        describeLiquidityPoolExchange(blockTx1.operations[0], null),
        null
    );
    assert.strictEqual(
        liquidityPoolExchangeRows([63, {account: "1.2.1"}], null),
        null
    );
}

function testHistoryResult() {
    const op = [
        63,
        {
            fee: {amount: 100000, asset_id: "1.3.0"},
            account: "1.2.883283",
            pool: "1.19.23",
            amount_to_sell: {amount: 1000, asset_id: "1.3.5589"},
            min_to_receive: {amount: 1, asset_id: "1.3.4159"},
            extensions: []
        }
    ];
    const view = describeLiquidityPoolExchange(op, historyResult);
    assert.strictEqual(historyResult[0], 4);
    assert.strictEqual(view.paid.amount, 948275);
    assert.strictEqual(view.paid.asset_id, "1.3.5589");
    assert.strictEqual(view.received.amount, 2181269);
    assert.strictEqual(view.received.asset_id, "1.3.4159");
    assert.strictEqual(view.fees.length, 3);
    assert.strictEqual(view.fees[0].amount, 758);
    assert.strictEqual(view.fees[2].amount, 6570);

    const summary = liquidityPoolExchangeSummary(op, historyResult);
    assert.strictEqual(summary.stringKey, "operation.liquidity_pool_exchange");
    assert.strictEqual(summary.amountA, view.paid);
    assert.strictEqual(summary.amountB, view.received);

    const rows = liquidityPoolExchangeRows(op, historyResult);
    assert.strictEqual(rows[5].label, "explorer.block.amount_paid");
    assert.strictEqual(rows[5].value.amount, 948275);
    assert.strictEqual(rows[6].label, "explorer.block.amount_received");
    assert.strictEqual(rows[6].value.amount, 2181269);
}

function testLocales() {
    const required = {
        operation: [
            "liquidity_pool_exchange",
            "liquidity_pool_exchange_limit"
        ],
        "transaction.trxTypes": ["liquidity_pool_exchange"],
        "explorer.block": [
            "liquidity_pool",
            "amount_paid",
            "amount_received"
        ]
    };

    ["en", "zh"].forEach(locale => {
        const data = JSON.parse(
            fs.readFileSync(
                path.join(
                    __dirname,
                    "../assets/locales/locale-" + locale + ".json"
                ),
                "utf8"
            )
        );
        required.operation.forEach(key => {
            assert.ok(data.operation[key], locale + " operation." + key);
            assert.ok(
                data.operation[key].indexOf("{account}") !== -1,
                locale + " " + key + " names the account"
            );
            assert.ok(
                data.operation[key].indexOf("{id}") !== -1,
                locale + " " + key + " names the pool"
            );
            assert.ok(
                data.operation[key].indexOf("{amount_a}") !== -1 &&
                    data.operation[key].indexOf("{amount_b}") !== -1,
                locale + " " + key + " names both amounts"
            );
        });
        assert.ok(
            data.transaction.trxTypes.liquidity_pool_exchange,
            locale + " trx type"
        );
        required["explorer.block"].forEach(key => {
            assert.ok(data.explorer.block[key], locale + " explorer.block." + key);
        });
    });
}

testNameMapping();
testBlockTransaction();
testHistoryResult();
testLocales();
console.log("liquidity_pool_exchange (op 63) checks passed");
