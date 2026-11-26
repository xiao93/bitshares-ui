/**
 * Operation 77 parser check.
 *
 * The account-history fixture is BitShares mainnet object 1.11.1402658651
 * (account eth5000, 1.2.1701199), returned by get_objects on
 * https://api.bts.mobi. It is a virtual limit_order_update produced while
 * filling order activity in block 116433945, transaction index 2. The
 * operation result is void_result [0, {}]. on_fill is omitted.
 *
 * Other bodies are real mainnet operations from the same node:
 *   1.11.1402636184  eth5000, delta and expiration, no new price
 *   1.11.1402659791  user update, new price only
 *   1.11.1402659779  user update, new price and a negative delta
 * The on_fill action is the create_take_profit_order_action stored on
 * eth5000 limit_order_create 1.11.1402636165 (extensions.on_fill). Update
 * operations use that same static-variant list in the top-level on_fill field.
 *
 * Run: node app/test/limitOrderUpdate.js
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
    "\nmodule.exports = {LIMIT_ORDER_UPDATE_ID, LIQUIDITY_POOL_EXCHANGE_ID, buildOperationNames, describeLimitOrderUpdate, limitOrderUpdateRows, operationTypeId};";
const loaded = {exports: {}};
const runner = new Function("module", "exports", transformed);
runner(loaded, loaded.exports);

const {
    LIMIT_ORDER_UPDATE_ID,
    LIQUIDITY_POOL_EXCHANGE_ID,
    buildOperationNames,
    describeLimitOrderUpdate,
    limitOrderUpdateRows,
    operationTypeId
} = loaded.exports;

const historyObject = {
    id: "1.11.1402658651",
    op: [
        77,
        {
            fee: {amount: 37500, asset_id: "1.3.0"},
            seller: "1.2.1701199",
            order: "1.7.576688315",
            new_price: {
                base: {amount: 135426, asset_id: "1.3.113"},
                quote: {amount: 21300512, asset_id: "1.3.0"}
            },
            delta_amount_to_sell: {amount: 131452, asset_id: "1.3.113"},
            new_expiration: "2106-02-07T06:28:15",
            extensions: []
        }
    ],
    result: [0, {}],
    block_num: 116433945,
    trx_in_block: 2,
    op_in_trx: 3,
    virtual_op: 3,
    is_virtual: true,
    block_time: "2026-11-26T02:00:42"
};

const eth5000NoPrice = [
    77,
    {
        fee: {amount: 37500, asset_id: "1.3.0"},
        seller: "1.2.1701199",
        order: "1.7.576660856",
        delta_amount_to_sell: {amount: 17969210, asset_id: "1.3.0"},
        new_expiration: "2106-02-07T06:28:15",
        extensions: []
    }
];

const priceOnly = [
    77,
    {
        fee: {amount: 37500, asset_id: "1.3.0"},
        seller: "1.2.1624309",
        order: "1.7.576697266",
        new_price: {
            base: {amount: 88100038, asset_id: "1.3.0"},
            quote: {amount: 38115, asset_id: "1.3.6444"}
        },
        extensions: []
    }
];

const negativeDelta = [
    77,
    {
        fee: {amount: 37500, asset_id: "1.3.0"},
        seller: "1.2.1624309",
        order: "1.7.576697345",
        new_price: {
            base: {amount: 92335220, asset_id: "1.3.0"},
            quote: {amount: 39708, asset_id: "1.3.6444"}
        },
        delta_amount_to_sell: {amount: -1621058, asset_id: "1.3.0"},
        extensions: []
    }
];

const takeProfitAction = [
    0,
    {
        fee_asset_id: "1.3.0",
        spread_percent: 101,
        size_percent: 10000,
        expiration_seconds: 4294900000,
        repeat: true,
        extensions: []
    }
];

function testNameMapping() {
    const base = [];
    for (let i = 0; i < 58; i++) {
        base.push("op_" + i);
    }
    base.push("ticket_update");

    const names = buildOperationNames(base);
    assert.strictEqual(LIMIT_ORDER_UPDATE_ID, 77);
    assert.strictEqual(LIQUIDITY_POOL_EXCHANGE_ID, 63);
    assert.strictEqual(names[0], "op_0");
    assert.strictEqual(names[58], "ticket_update");
    assert.strictEqual(names[63], "liquidity_pool_exchange");
    assert.strictEqual(names[77], "limit_order_update");
    assert.strictEqual(names[76], undefined);

    const preset = ["transfer"];
    preset[63] = "liquidity_pool_exchange";
    preset[77] = "custom_update_name";
    const kept = buildOperationNames(preset);
    assert.strictEqual(kept[0], "transfer");
    assert.strictEqual(kept[63], "liquidity_pool_exchange");
    assert.strictEqual(kept[77], "custom_update_name");

    const chainTypes = {
        transfer: 0,
        limit_order_create: 1,
        limit_order_cancel: 2,
        fill_order: 4
    };
    assert.strictEqual(operationTypeId("transfer", chainTypes), 0);
    assert.strictEqual(operationTypeId("limit_order_create", chainTypes), 1);
    assert.strictEqual(operationTypeId("limit_order_update", chainTypes), 77);
    assert.strictEqual(
        operationTypeId("liquidity_pool_exchange", chainTypes),
        63
    );
}

function testHistoryObject() {
    assert.strictEqual(historyObject.result[0], 0);
    assert.deepStrictEqual(historyObject.result[1], {});
    assert.strictEqual(historyObject.op[0], 77);
    assert.strictEqual(historyObject.is_virtual, true);

    const view = describeLimitOrderUpdate(historyObject.op);
    assert.strictEqual(view.seller, "1.2.1701199");
    assert.strictEqual(view.order, "1.7.576688315");
    assert.strictEqual(view.fee.amount, 37500);
    assert.strictEqual(view.fee.asset_id, "1.3.0");
    assert.strictEqual(view.newPrice.base.amount, 135426);
    assert.strictEqual(view.newPrice.base.asset_id, "1.3.113");
    assert.strictEqual(view.newPrice.quote.amount, 21300512);
    assert.strictEqual(view.newPrice.quote.asset_id, "1.3.0");
    assert.strictEqual(view.deltaAmountToSell.amount, 131452);
    assert.strictEqual(view.deltaAmountToSell.asset_id, "1.3.113");
    assert.strictEqual(view.newExpiration, "2106-02-07T06:28:15");
    assert.strictEqual(view.onFill, null);

    const rows = limitOrderUpdateRows(historyObject.op);
    assert.deepStrictEqual(rows.map(row => row.label), [
        "transaction.seller",
        "transaction.order_id",
        "explorer.block.new_price",
        "explorer.block.delta_amount",
        "explorer.block.new_expiration"
    ]);
    assert.strictEqual(rows[0].value, "1.2.1701199");
    assert.strictEqual(rows[1].value, "1.7.576688315");
    assert.strictEqual(rows[2].base.amount, 135426);
    assert.strictEqual(rows[2].quote.amount, 21300512);
    assert.strictEqual(rows[3].value.amount, 131452);
    assert.strictEqual(rows[4].value, "2106-02-07T06:28:15");
}

function testOptionalFields() {
    const noPrice = describeLimitOrderUpdate(eth5000NoPrice);
    assert.strictEqual(noPrice.newPrice, null);
    assert.strictEqual(noPrice.deltaAmountToSell.amount, 17969210);
    assert.strictEqual(noPrice.deltaAmountToSell.asset_id, "1.3.0");
    assert.strictEqual(noPrice.newExpiration, "2106-02-07T06:28:15");
    assert.strictEqual(noPrice.onFill, null);
    assert.deepStrictEqual(
        limitOrderUpdateRows(eth5000NoPrice).map(row => row.kind),
        ["account", "text", "amount", "text"]
    );

    const onlyPrice = describeLimitOrderUpdate(priceOnly);
    assert.strictEqual(onlyPrice.deltaAmountToSell, null);
    assert.strictEqual(onlyPrice.newExpiration, null);
    assert.strictEqual(onlyPrice.newPrice.quote.asset_id, "1.3.6444");
    assert.deepStrictEqual(
        limitOrderUpdateRows(priceOnly).map(row => row.label),
        ["transaction.seller", "transaction.order_id", "explorer.block.new_price"]
    );

    const decreased = describeLimitOrderUpdate(negativeDelta);
    assert.strictEqual(decreased.deltaAmountToSell.amount, -1621058);
    assert.strictEqual(decreased.newExpiration, null);

    const withAction = describeLimitOrderUpdate([
        77,
        {
            fee: {amount: "37500", asset_id: "1.3.0"},
            seller: "1.2.1701199",
            order: "1.7.576688315",
            on_fill: [takeProfitAction],
            extensions: []
        }
    ]);
    assert.strictEqual(withAction.fee.amount, 37500);
    assert.strictEqual(withAction.newPrice, null);
    assert.strictEqual(withAction.onFill.length, 1);
    assert.strictEqual(withAction.onFill[0].known, true);
    assert.strictEqual(withAction.onFill[0].feeAssetId, "1.3.0");
    assert.strictEqual(withAction.onFill[0].spreadPercent, 101);
    assert.strictEqual(withAction.onFill[0].spread, "1.01%");
    assert.strictEqual(withAction.onFill[0].sizePercent, 10000);
    assert.strictEqual(withAction.onFill[0].size, "100%");
    assert.strictEqual(withAction.onFill[0].expirationSeconds, 4294900000);
    assert.strictEqual(withAction.onFill[0].repeat, true);
    assert.strictEqual(limitOrderUpdateRows([
        77,
        {
            seller: "1.2.1701199",
            order: "1.7.1",
            on_fill: [takeProfitAction]
        }
    ])[2].kind, "on_fill");

    const cleared = describeLimitOrderUpdate([
        77,
        {
            seller: "1.2.1701199",
            order: "1.7.1",
            new_price: null,
            delta_amount_to_sell: null,
            new_expiration: null,
            on_fill: [],
            extensions: {}
        }
    ]);
    assert.strictEqual(cleared.newPrice, null);
    assert.strictEqual(cleared.deltaAmountToSell, null);
    assert.strictEqual(cleared.newExpiration, null);
    assert.deepStrictEqual(cleared.onFill, []);
    assert.strictEqual(
        limitOrderUpdateRows([
            77,
            {seller: "1.2.1701199", order: "1.7.1", on_fill: []}
        ])[2].kind,
        "on_fill_clear"
    );

    const messy = describeLimitOrderUpdate([
        77,
        {
            seller: "1.2.1701199",
            order: "1.7.1",
            new_price: {base: null, quote: {amount: 1, asset_id: "1.3.0"}},
            delta_amount_to_sell: {amount: "250", asset_id: "1.3.121"},
            new_expiration: "",
            on_fill: ["bad", [2, {unrecognized: true}], takeProfitAction],
            extensions: [{future: 1}]
        }
    ]);
    assert.strictEqual(messy.newPrice, null);
    assert.strictEqual(messy.newExpiration, null);
    assert.strictEqual(messy.deltaAmountToSell.amount, 250);
    assert.strictEqual(messy.deltaAmountToSell.asset_id, "1.3.121");
    assert.strictEqual(messy.onFill.length, 2);
    assert.strictEqual(messy.onFill[0].known, false);
    assert.strictEqual(messy.onFill[0].typeIndex, 2);
    assert.strictEqual(messy.onFill[1].spread, "1.01%");

    const unreadable = describeLimitOrderUpdate([
        77,
        {seller: "1.2.1701199", order: "1.7.1", on_fill: ["bad", null]}
    ]);
    assert.strictEqual(unreadable.onFill.length, 1);
    assert.strictEqual(unreadable.onFill[0].known, false);
    assert.strictEqual(
        limitOrderUpdateRows([
            77,
            {seller: "1.2.1701199", order: "1.7.1", on_fill: ["bad"]}
        ])[2].kind,
        "on_fill"
    );

    assert.strictEqual(describeLimitOrderUpdate([77, {seller: "1.2.1"}]), null);
    assert.strictEqual(describeLimitOrderUpdate([77, null]), null);
    assert.strictEqual(describeLimitOrderUpdate(null), null);
    assert.strictEqual(
        describeLimitOrderUpdate([1, historyObject.op[1]]),
        null
    );
    assert.strictEqual(limitOrderUpdateRows([77, {order: "1.7.1"}]), null);
}

function testLocales() {
    const operationKeys = [
        "limit_order_update",
        "limit_order_update_price",
        "limit_order_update_delta",
        "limit_order_update_expiration",
        "limit_order_update_on_fill_detail",
        "limit_order_update_on_fill_unknown",
        "limit_order_update_on_fill_clear",
        "limit_order_update_repeats",
        "limit_order_update_once"
    ];
    const blockKeys = [
        "new_price",
        "delta_amount",
        "new_expiration",
        "on_fill"
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
        assert.ok(
            data.operation.limit_order_update.indexOf("{account}") !== -1,
            locale + " names the account"
        );
        assert.ok(
            data.operation.limit_order_update.indexOf("%(order)s") !== -1,
            locale + " names the order"
        );
        assert.ok(
            data.operation.limit_order_update_price.indexOf("{price}") !== -1
        );
        assert.ok(
            data.operation.limit_order_update_delta.indexOf("{amount}") !== -1
        );
        assert.ok(data.transaction.trxTypes.limit_order_update, locale);
        blockKeys.forEach(key => {
            assert.ok(data.explorer.block[key], locale + " explorer.block." + key);
        });
        assert.ok(data.transaction.seller, locale + " seller");
        assert.ok(data.transaction.order_id, locale + " order id");
    });
}

testNameMapping();
testHistoryObject();
testOptionalFields();
testLocales();
console.log("limit_order_update (op 77) checks passed");
