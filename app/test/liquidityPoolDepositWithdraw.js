/**
 * Operation 61 and 62 parser check.
 *
 * Fixtures are account-history objects for iobanker-core (1.2.1120617) from
 * BitShares mainnet history_api.get_account_history_operations on
 * https://api.bts.mobi/ws.
 *
 * Deposit 1.11.1175342488, block 62997769 transaction 1 (2021-10-21T20:44:33Z),
 * pool 1.19.133 (BTS 1.3.0 / IOB.XRP 1.3.5537, share IOB.BTSXRP 1.3.6032).
 * The offered BTS amount does not fit in a JavaScript safe integer, so the
 * node sends it as a string. The result (type 4,
 * generic_exchange_operation_result) deposits less BTS than was offered.
 *
 * Withdrawals 1.11.1177395646 (block 63513977 tx 0) and 1.11.1177395659
 * (block 63513981 tx 1, 2021-11-08T20:35:09Z). get_block on this node returns
 * the same operation_results. The empty-result cases cover nodes that leave
 * operation_results empty, which the block page still has to render.
 *
 * Run: node app/test/liquidityPoolDepositWithdraw.js
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
    "\nmodule.exports = {LIQUIDITY_POOL_DEPOSIT_ID, LIQUIDITY_POOL_WITHDRAW_ID, LIQUIDITY_POOL_EXCHANGE_ID, LIMIT_ORDER_UPDATE_ID, buildOperationNames, operationTypeId, describeLiquidityPoolDeposit, liquidityPoolDepositSummary, liquidityPoolDepositRows, describeLiquidityPoolWithdraw, liquidityPoolWithdrawSummary, liquidityPoolWithdrawRows};";
const loaded = {exports: {}};
const runner = new Function("module", "exports", transformed);
runner(loaded, loaded.exports);

const {
    LIQUIDITY_POOL_DEPOSIT_ID,
    LIQUIDITY_POOL_WITHDRAW_ID,
    LIQUIDITY_POOL_EXCHANGE_ID,
    LIMIT_ORDER_UPDATE_ID,
    buildOperationNames,
    operationTypeId,
    describeLiquidityPoolDeposit,
    liquidityPoolDepositSummary,
    liquidityPoolDepositRows,
    describeLiquidityPoolWithdraw,
    liquidityPoolWithdrawSummary,
    liquidityPoolWithdrawRows
} = loaded.exports;

const depositOp = [
    61,
    {
        fee: {amount: 10000, asset_id: "1.3.0"},
        account: "1.2.1120617",
        pool: "1.19.133",
        amount_a: {amount: "34817770000000022", asset_id: "1.3.0"},
        amount_b: {amount: 1552048, asset_id: "1.3.5537"},
        extensions: []
    }
];

const depositResult = [
    4,
    {
        paid: [
            {amount: 280374697, asset_id: "1.3.0"},
            {amount: 1552048, asset_id: "1.3.5537"}
        ],
        received: [{amount: 265900125, asset_id: "1.3.6032"}],
        fees: []
    }
];

const withdrawOp = [
    62,
    {
        fee: {amount: 500000, asset_id: "1.3.0"},
        account: "1.2.1120617",
        pool: "1.19.133",
        share_amount: {amount: 165900125, asset_id: "1.3.6032"},
        extensions: []
    }
];

const withdrawResult = [
    4,
    {
        paid: [{amount: 165900125, asset_id: "1.3.6032"}],
        received: [
            {amount: 203251501, asset_id: "1.3.0"},
            {amount: 833813, asset_id: "1.3.5537"}
        ],
        fees: [
            {amount: 203454, asset_id: "1.3.0"},
            {amount: 834, asset_id: "1.3.5537"}
        ]
    }
];

const withdrawOpEarlier = [
    62,
    {
        fee: {amount: 500000, asset_id: "1.3.0"},
        account: "1.2.1120617",
        pool: "1.19.133",
        share_amount: {amount: 100000000, asset_id: "1.3.6032"},
        extensions: []
    }
];

const withdrawResultEarlier = [
    4,
    {
        paid: [{amount: 100000000, asset_id: "1.3.6032"}],
        received: [
            {amount: 122477711, asset_id: "1.3.0"},
            {amount: 502449, asset_id: "1.3.5537"}
        ],
        fees: [
            {amount: 122600, asset_id: "1.3.0"},
            {amount: 502, asset_id: "1.3.5537"}
        ]
    }
];

function labels(rows) {
    return rows.map(row => row.label);
}

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
    assert.strictEqual(names[60], "liquidity_pool_delete");
    assert.strictEqual(names[61], "liquidity_pool_deposit");
    assert.strictEqual(names[62], "liquidity_pool_withdraw");
    assert.strictEqual(names[63], "liquidity_pool_exchange");
    assert.strictEqual(names[64], "samet_fund_create");
    assert.strictEqual(names[76], "credit_deal_update");
    assert.strictEqual(names[77], "limit_order_update");
    assert.strictEqual(LIQUIDITY_POOL_DEPOSIT_ID, 61);
    assert.strictEqual(LIQUIDITY_POOL_WITHDRAW_ID, 62);
    assert.strictEqual(LIQUIDITY_POOL_EXCHANGE_ID, 63);
    assert.strictEqual(LIMIT_ORDER_UPDATE_ID, 77);

    const preset = ["transfer"];
    preset[61] = "custom_deposit";
    const kept = buildOperationNames(preset);
    assert.strictEqual(kept[0], "transfer");
    assert.strictEqual(kept[61], "custom_deposit");
    assert.strictEqual(kept[62], "liquidity_pool_withdraw");

    const chainTypes = {transfer: 0, limit_order_create: 1};
    assert.strictEqual(operationTypeId("transfer", chainTypes), 0);
    assert.strictEqual(
        operationTypeId("liquidity_pool_deposit", chainTypes),
        61
    );
    assert.strictEqual(
        operationTypeId("liquidity_pool_withdraw", chainTypes),
        62
    );
    assert.strictEqual(
        operationTypeId("liquidity_pool_deposit", {
            liquidity_pool_deposit: 61
        }),
        61
    );
}

function testDeposit() {
    const view = describeLiquidityPoolDeposit(depositOp, depositResult);
    assert.strictEqual(view.account, "1.2.1120617");
    assert.strictEqual(view.pool, "1.19.133");
    assert.strictEqual(view.amountA.amount, "34817770000000022");
    assert.notStrictEqual(
        view.amountA.amount,
        Number("34817770000000022")
    );
    assert.strictEqual(view.amountA.asset_id, "1.3.0");
    assert.strictEqual(view.amountB.amount, 1552048);
    assert.strictEqual(view.amountB.asset_id, "1.3.5537");
    assert.strictEqual(view.fee.amount, 10000);
    assert.strictEqual(view.paid.length, 2);
    assert.strictEqual(view.paid[0].amount, 280374697);
    assert.strictEqual(view.paid[0].asset_id, "1.3.0");
    assert.strictEqual(view.paid[1].amount, 1552048);
    assert.strictEqual(view.paid[1].asset_id, "1.3.5537");
    assert.strictEqual(view.received.length, 1);
    assert.strictEqual(view.received[0].amount, 265900125);
    assert.strictEqual(view.received[0].asset_id, "1.3.6032");
    assert.deepStrictEqual(view.fees, []);

    const summary = liquidityPoolDepositSummary(depositOp, depositResult);
    assert.strictEqual(summary.stringKey, "operation.liquidity_pool_deposit");
    assert.deepStrictEqual(
        summary.keys.map(key => key.arg),
        ["account", "id", "amount_a", "amount_b", "share"]
    );
    assert.strictEqual(summary.keys[2].value.amount, 280374697);
    assert.strictEqual(summary.keys[3].value.amount, 1552048);
    assert.strictEqual(summary.keys[4].value.amount, 265900125);
    assert.deepStrictEqual(summary.fees, []);

    const rows = liquidityPoolDepositRows(depositOp, depositResult);
    assert.deepStrictEqual(labels(rows), [
        "header.account",
        "explorer.block.liquidity_pool",
        "explorer.block.asset_a",
        "explorer.block.asset_b",
        "explorer.block.amount_paid",
        "explorer.block.amount_paid",
        "explorer.block.amount_received"
    ]);
    assert.strictEqual(rows[2].value.amount, "34817770000000022");
    assert.strictEqual(rows[4].value.amount, 280374697);
    assert.strictEqual(rows[6].value.asset_id, "1.3.6032");
}

function testDepositWithoutResult() {
    [undefined, null, []].forEach(result => {
        const view = describeLiquidityPoolDeposit(depositOp, result);
        assert.strictEqual(view.amountA.amount, "34817770000000022");
        assert.deepStrictEqual(view.paid, []);
        assert.deepStrictEqual(view.received, []);
        assert.deepStrictEqual(view.fees, []);
        const summary = liquidityPoolDepositSummary(depositOp, result);
        assert.strictEqual(
            summary.stringKey,
            "operation.liquidity_pool_deposit_offer"
        );
        assert.strictEqual(summary.keys[2].value.amount, "34817770000000022");
        assert.strictEqual(summary.keys[3].value.amount, 1552048);
        assert.strictEqual(
            summary.keys.some(key => key.arg === "share"),
            false
        );
        const rows = liquidityPoolDepositRows(depositOp, result);
        assert.deepStrictEqual(labels(rows), [
            "header.account",
            "explorer.block.liquidity_pool",
            "explorer.block.asset_a",
            "explorer.block.asset_b"
        ]);
    });

    const block = {operations: [depositOp], operation_results: []};
    assert.strictEqual(
        liquidityPoolDepositSummary(
            block.operations[0],
            block.operation_results[0]
        ).stringKey,
        "operation.liquidity_pool_deposit_offer"
    );
}

function testWithdraw() {
    const view = describeLiquidityPoolWithdraw(withdrawOp, withdrawResult);
    assert.strictEqual(view.account, "1.2.1120617");
    assert.strictEqual(view.pool, "1.19.133");
    assert.strictEqual(view.shareAmount.amount, 165900125);
    assert.strictEqual(view.shareAmount.asset_id, "1.3.6032");
    assert.strictEqual(view.fee.amount, 500000);
    assert.strictEqual(view.paid[0].amount, 165900125);
    assert.strictEqual(view.received[0].amount, 203251501);
    assert.strictEqual(view.received[0].asset_id, "1.3.0");
    assert.strictEqual(view.received[1].amount, 833813);
    assert.strictEqual(view.received[1].asset_id, "1.3.5537");
    assert.strictEqual(view.fees[0].amount, 203454);
    assert.strictEqual(view.fees[1].amount, 834);

    const summary = liquidityPoolWithdrawSummary(withdrawOp, withdrawResult);
    assert.strictEqual(
        summary.stringKey,
        "operation.liquidity_pool_withdraw_received"
    );
    assert.strictEqual(summary.keys[2].arg, "share");
    assert.strictEqual(summary.keys[2].value.amount, 165900125);
    assert.strictEqual(summary.keys[3].value.amount, 203251501);
    assert.strictEqual(summary.keys[4].value.amount, 833813);
    assert.strictEqual(summary.fees.length, 2);
    assert.strictEqual(summary.fees[0].amount, 203454);

    const rows = liquidityPoolWithdrawRows(withdrawOp, withdrawResult);
    assert.deepStrictEqual(labels(rows), [
        "header.account",
        "explorer.block.liquidity_pool",
        "explorer.block.share_amount",
        "explorer.block.amount_received",
        "explorer.block.amount_received",
        "explorer.block.pool_fee",
        "explorer.block.pool_fee"
    ]);
    assert.strictEqual(rows[5].value.amount, 203454);
    assert.strictEqual(rows[6].value.asset_id, "1.3.5537");

    const earlier = describeLiquidityPoolWithdraw(
        withdrawOpEarlier,
        withdrawResultEarlier
    );
    assert.strictEqual(earlier.shareAmount.amount, 100000000);
    assert.strictEqual(earlier.received[0].amount, 122477711);
    assert.strictEqual(earlier.fees[1].amount, 502);
    assert.strictEqual(
        liquidityPoolWithdrawSummary(withdrawOpEarlier, withdrawResultEarlier)
            .stringKey,
        "operation.liquidity_pool_withdraw_received"
    );
}

function testWithdrawWithoutResult() {
    const view = describeLiquidityPoolWithdraw(withdrawOp, undefined);
    assert.strictEqual(view.shareAmount.amount, 165900125);
    assert.deepStrictEqual(view.paid, []);
    assert.deepStrictEqual(view.received, []);
    const summary = liquidityPoolWithdrawSummary(withdrawOp, null);
    assert.strictEqual(summary.stringKey, "operation.liquidity_pool_withdraw");
    assert.deepStrictEqual(
        summary.keys.map(key => key.arg),
        ["account", "id", "share"]
    );
    assert.deepStrictEqual(summary.fees, []);
    const block = {operations: [withdrawOp], operation_results: []};
    const rows = liquidityPoolWithdrawRows(
        block.operations[0],
        block.operation_results[0]
    );
    assert.deepStrictEqual(labels(rows), [
        "header.account",
        "explorer.block.liquidity_pool",
        "explorer.block.share_amount"
    ]);
}

function testPartialAndMalformed() {
    const paidOnly = liquidityPoolDepositSummary(depositOp, [
        4,
        {
            paid: depositResult[1].paid,
            received: [],
            fees: null
        }
    ]);
    assert.strictEqual(
        paidOnly.stringKey,
        "operation.liquidity_pool_deposit_paid"
    );
    assert.strictEqual(
        paidOnly.keys.some(key => key.arg === "share"),
        false
    );

    const shareOnly = liquidityPoolDepositSummary(depositOp, [
        4,
        {received: depositResult[1].received, paid: [null, {amount: "no"}]}
    ]);
    assert.strictEqual(shareOnly.stringKey, "operation.liquidity_pool_deposit");
    assert.strictEqual(shareOnly.keys[2].value.amount, "34817770000000022");
    assert.strictEqual(shareOnly.keys[4].value.amount, 265900125);

    const oneReceived = liquidityPoolWithdrawSummary(withdrawOp, [
        4,
        {
            paid: [{amount: 1, asset_id: "1.3.0"}],
            received: [{amount: 9, asset_id: "1.3.0"}],
            fees: [
                {amount: 0, asset_id: "1.3.0"},
                {amount: "0", asset_id: "1.3.5537"},
                null,
                {amount: 3, asset_id: "1.3.1"}
            ]
        }
    ]);
    assert.strictEqual(
        oneReceived.stringKey,
        "operation.liquidity_pool_withdraw_one"
    );
    assert.strictEqual(oneReceived.fees.length, 1);
    assert.strictEqual(oneReceived.fees[0].amount, 3);
    const oneRows = liquidityPoolWithdrawRows(withdrawOp, [
        4,
        {
            paid: [{amount: 1, asset_id: "1.3.0"}],
            received: [{amount: 9, asset_id: "1.3.0"}],
            fees: [{amount: 0, asset_id: "1.3.0"}, {amount: 3, asset_id: "1.3.1"}]
        }
    ]);
    assert.ok(labels(oneRows).indexOf("explorer.block.amount_paid") !== -1);
    assert.strictEqual(
        labels(oneRows).filter(label => label === "explorer.block.pool_fee")
            .length,
        1
    );

    const noFee = describeLiquidityPoolDeposit(
        [
            61,
            {
                account: "1.2.1120617",
                pool: "1.19.133",
                amount_a: {amount: 1, asset_id: "1.3.0"},
                amount_b: {amount: "2", asset_id: "1.3.1"}
            }
        ],
        [0, {}]
    );
    assert.strictEqual(noFee.fee, null);
    assert.strictEqual(noFee.amountB.amount, "2");
    assert.deepStrictEqual(noFee.paid, []);

    assert.strictEqual(describeLiquidityPoolDeposit(null, null), null);
    assert.strictEqual(describeLiquidityPoolDeposit([61, null], null), null);
    assert.strictEqual(describeLiquidityPoolDeposit([61, {}], null), null);
    assert.strictEqual(
        describeLiquidityPoolDeposit(
            [
                61,
                {
                    account: "",
                    pool: "1.19.133",
                    amount_a: {amount: 1, asset_id: "1.3.0"},
                    amount_b: {amount: 1, asset_id: "1.3.1"}
                }
            ],
            null
        ),
        null
    );
    assert.strictEqual(
        describeLiquidityPoolDeposit(
            [
                61,
                {
                    account: "1.2.1",
                    pool: "1.19.1",
                    amount_a: {amount: null, asset_id: "1.3.0"},
                    amount_b: {amount: 1, asset_id: "1.3.1"}
                }
            ],
            null
        ),
        null
    );
    assert.strictEqual(
        describeLiquidityPoolDeposit(
            [
                61,
                {
                    account: "1.2.1",
                    pool: "1.19.1",
                    amount_a: {amount: "1.5", asset_id: "1.3.0"},
                    amount_b: {amount: 1, asset_id: "1.3.1"}
                }
            ],
            null
        ),
        null
    );
    assert.strictEqual(describeLiquidityPoolDeposit(withdrawOp, null), null);
    assert.strictEqual(describeLiquidityPoolWithdraw(depositOp, null), null);
    assert.strictEqual(describeLiquidityPoolWithdraw([62, {}], null), null);
    assert.strictEqual(
        describeLiquidityPoolWithdraw(
            [
                62,
                {
                    account: "1.2.1",
                    pool: 119,
                    share_amount: {amount: 1, asset_id: "1.3.1"}
                }
            ],
            null
        ),
        null
    );
    assert.strictEqual(
        liquidityPoolDepositRows(depositOp, "not-a-result").length,
        4
    );
    assert.deepStrictEqual(
        describeLiquidityPoolWithdraw(withdrawOp, [4, {fees: "bad"}]).fees,
        []
    );
    assert.strictEqual(
        describeLiquidityPoolDeposit([63, depositOp[1]], depositResult),
        null
    );
}

function testLocales() {
    const operationKeys = [
        "liquidity_pool_deposit",
        "liquidity_pool_deposit_paid",
        "liquidity_pool_deposit_offer",
        "liquidity_pool_withdraw",
        "liquidity_pool_withdraw_received",
        "liquidity_pool_withdraw_one",
        "liquidity_pool_fee"
    ];
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
        operationKeys.forEach(key => {
            assert.ok(data.operation[key], locale + " operation." + key);
        });
        ["liquidity_pool_deposit", "liquidity_pool_deposit_paid", "liquidity_pool_deposit_offer"].forEach(
            key => {
                assert.ok(data.operation[key].indexOf("{account}") !== -1);
                assert.ok(data.operation[key].indexOf("{id}") !== -1);
                assert.ok(data.operation[key].indexOf("{amount_a}") !== -1);
                assert.ok(data.operation[key].indexOf("{amount_b}") !== -1);
            }
        );
        assert.ok(
            data.operation.liquidity_pool_deposit.indexOf("{share}") !== -1
        );
        assert.ok(
            data.operation.liquidity_pool_deposit_offer.indexOf("{share}") ===
                -1
        );
        assert.ok(
            data.operation.liquidity_pool_withdraw.indexOf("{share}") !== -1
        );
        assert.ok(
            data.operation.liquidity_pool_withdraw_received.indexOf(
                "{amount_b}"
            ) !== -1
        );
        assert.ok(
            data.operation.liquidity_pool_withdraw_one.indexOf("{amount_b}") ===
                -1
        );
        assert.ok(
            data.operation.liquidity_pool_fee.indexOf("{amount}") !== -1
        );
        assert.ok(data.transaction.trxTypes.liquidity_pool_deposit, locale);
        assert.ok(data.transaction.trxTypes.liquidity_pool_withdraw, locale);
        ["asset_a", "asset_b", "share_amount", "pool_fee"].forEach(key => {
            assert.ok(data.explorer.block[key], locale + " " + key);
        });
    });
}

testNameMapping();
testDeposit();
testDepositWithoutResult();
testWithdraw();
testWithdrawWithoutResult();
testPartialAndMalformed();
testLocales();
console.log("liquidity_pool_deposit/withdraw (ops 61 and 62) checks passed");
