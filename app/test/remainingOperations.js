/**
 * Operations 0–77: id mapping, safe parsers, and EN/ZH locale keys.
 *
 * Names follow bitshares-core master operations.hpp. Ids 0–58, 61, 62, 63,
 * and 77 stay where they already were.
 *
 * Run: node app/test/remainingOperations.js
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const CANONICAL = [
    "transfer",
    "limit_order_create",
    "limit_order_cancel",
    "call_order_update",
    "fill_order",
    "account_create",
    "account_update",
    "account_whitelist",
    "account_upgrade",
    "account_transfer",
    "asset_create",
    "asset_update",
    "asset_update_bitasset",
    "asset_update_feed_producers",
    "asset_issue",
    "asset_reserve",
    "asset_fund_fee_pool",
    "asset_settle",
    "asset_global_settle",
    "asset_publish_feed",
    "witness_create",
    "witness_update",
    "proposal_create",
    "proposal_update",
    "proposal_delete",
    "withdraw_permission_create",
    "withdraw_permission_update",
    "withdraw_permission_claim",
    "withdraw_permission_delete",
    "committee_member_create",
    "committee_member_update",
    "committee_member_update_global_parameters",
    "vesting_balance_create",
    "vesting_balance_withdraw",
    "worker_create",
    "custom",
    "assert",
    "balance_claim",
    "override_transfer",
    "transfer_to_blind",
    "blind_transfer",
    "transfer_from_blind",
    "asset_settle_cancel",
    "asset_claim_fees",
    "fba_distribute",
    "bid_collateral",
    "execute_bid",
    "asset_claim_pool",
    "asset_update_issuer",
    "htlc_create",
    "htlc_redeem",
    "htlc_redeemed",
    "htlc_extend",
    "htlc_refund",
    "custom_authority_create",
    "custom_authority_update",
    "custom_authority_delete",
    "ticket_create",
    "ticket_update",
    "liquidity_pool_create",
    "liquidity_pool_delete",
    "liquidity_pool_deposit",
    "liquidity_pool_withdraw",
    "liquidity_pool_exchange",
    "samet_fund_create",
    "samet_fund_delete",
    "samet_fund_update",
    "samet_fund_borrow",
    "samet_fund_repay",
    "credit_offer_create",
    "credit_offer_delete",
    "credit_offer_update",
    "credit_offer_accept",
    "credit_deal_repay",
    "credit_deal_expired",
    "liquidity_pool_update",
    "credit_deal_update",
    "limit_order_update"
];

function loadModule(relativePath, exportNames) {
    const source = fs.readFileSync(
        path.join(__dirname, relativePath),
        "utf8"
    );
    const transformed = source.replace(/^export /gm, "");
    const loaded = {exports: {}};
    const runner = new Function(
        "module",
        "exports",
        transformed +
            "\nmodule.exports = {" +
            exportNames.join(", ") +
            "};"
    );
    runner(loaded, loaded.exports);
    return loaded.exports;
}

const namesApi = loadModule("../lib/common/operationNames.js", [
    "buildOperationNames",
    "operationTypeId"
]);
const details = loadModule("../lib/common/operationDetails.js", [
    "coreOperationNames",
    "isHistoryOperation",
    "isBlockOperation",
    "describeRemainingOperation",
    "historyOperationSummary",
    "blockOperationRows"
]);

const {
    buildOperationNames,
    operationTypeId
} = namesApi;
const {
    coreOperationNames,
    isHistoryOperation,
    isBlockOperation,
    describeRemainingOperation,
    historyOperationSummary,
    blockOperationRows
} = details;

function asset(amount, id) {
    return {amount, asset_id: id};
}

function price(baseAmount, baseId, quoteAmount, quoteId) {
    return {
        base: asset(baseAmount, baseId),
        quote: asset(quoteAmount, quoteId)
    };
}

const LARGE = "34817770000000022";

function testMapping() {
    assert.strictEqual(CANONICAL.length, 78);
    assert.deepStrictEqual(coreOperationNames(), CANONICAL);

    const fromChainTypes = buildOperationNames(CANONICAL.slice(0, 59));
    assert.deepStrictEqual(fromChainTypes, CANONICAL);
    [0, 58, 61, 62, 63, 77].forEach(id => {
        assert.strictEqual(fromChainTypes[id], CANONICAL[id]);
    });

    const preset = ["transfer"];
    preset[59] = "keep_create";
    preset[61] = "keep_deposit";
    preset[77] = "keep_update";
    const kept = buildOperationNames(preset);
    assert.strictEqual(kept[0], "transfer");
    assert.strictEqual(kept[59], "keep_create");
    assert.strictEqual(kept[60], "liquidity_pool_delete");
    assert.strictEqual(kept[61], "keep_deposit");
    assert.strictEqual(kept[77], "keep_update");

    assert.strictEqual(operationTypeId("transfer", {transfer: 0}), 0);
    assert.strictEqual(operationTypeId("liquidity_pool_deposit"), 61);
    assert.strictEqual(operationTypeId("liquidity_pool_exchange"), 63);
    assert.strictEqual(operationTypeId("limit_order_update"), 77);
    assert.strictEqual(operationTypeId("samet_fund_borrow"), 67);
    assert.strictEqual(operationTypeId("credit_deal_expired"), 74);
    assert.strictEqual(operationTypeId("credit_deal_update"), 76);
    assert.strictEqual(operationTypeId("missing_op"), undefined);

    CANONICAL.forEach((name, id) => {
        if (id > 58 && id !== 61 && id !== 62 && id !== 63 && id !== 77) {
            assert.strictEqual(isHistoryOperation(id), true, name);
            assert.strictEqual(isBlockOperation(id), true, name);
        }
    });
    [4, 18, 25, 26, 27, 28, 31, 32, 35, 38, 42, 51, 53, 57].forEach(id => {
        assert.strictEqual(isHistoryOperation(id), false, CANONICAL[id]);
        assert.strictEqual(isBlockOperation(id), true, CANONICAL[id]);
    });
    [61, 62, 63, 77].forEach(id => {
        assert.strictEqual(isHistoryOperation(id), false);
        assert.strictEqual(isBlockOperation(id), false);
    });
}

function op(id, body) {
    return [id, body];
}

function assertView(id, body, expects) {
    const described = describeRemainingOperation(op(id, body));
    assert.ok(described, CANONICAL[id] + " parsed");
    const history = historyOperationSummary(op(id, body), {ignored: true});
    const block = blockOperationRows(op(id, body), null);
    if (expects.history) {
        assert.ok(history && history.summary, CANONICAL[id] + " history");
        assert.strictEqual(history.summary.stringKey, expects.stringKey);
    } else {
        assert.strictEqual(history, null, CANONICAL[id] + " keeps its history renderer");
    }
    assert.ok(block && block.rows && block.rows.length, CANONICAL[id] + " rows");
    if (expects.label) {
        assert.ok(
            block.rows.some(row => row.label === expects.label),
            CANONICAL[id] + " missing " + expects.label
        );
    }
    return described;
}

function assertRejected(id, body) {
    assert.strictEqual(
        describeRemainingOperation(op(id, body)),
        null,
        CANONICAL[id] + " should reject malformed input"
    );
    if (isHistoryOperation(id)) {
        assert.strictEqual(historyOperationSummary(op(id, body)), null);
    }
    if (isBlockOperation(id)) {
        assert.strictEqual(blockOperationRows(op(id, body)), null);
    }
}

function testParsers() {
    const account = "1.2.17";
    const other = "1.2.18";
    const bts = asset(100000, "1.3.0");
    const usd = asset(LARGE, "1.3.121");

    assertView(59, {
        account,
        asset_a: "1.3.0",
        asset_b: "1.3.121",
        share_asset: "1.3.5000",
        taker_fee_percent: 20,
        withdrawal_fee_percent: 50
    }, {history: true, stringKey: "operation.liquidity_pool_create", label: "explorer.block.share_asset"});
    assertView(59, {
        account,
        asset_a: "1.3.0",
        asset_b: "1.3.121",
        share_asset: "1.3.5000"
    }, {history: true, stringKey: "operation.liquidity_pool_create"});
    assertRejected(59, {account, asset_a: "1.3.0"});
    assertRejected(59, {account: 1, asset_a: "1.3.0", asset_b: "1.3.121", share_asset: "1.3.1"});

    assertView(60, {account, pool: "1.19.5"}, {
        history: true,
        stringKey: "operation.liquidity_pool_delete",
        label: "explorer.block.liquidity_pool"
    });
    assertRejected(60, {account});

    assertView(75, {
        account,
        pool: "1.19.5",
        taker_fee_percent: null,
        withdrawal_fee_percent: "nope"
    }, {history: true, stringKey: "operation.liquidity_pool_update"});

    const created = assertView(64, {
        owner_account: account,
        asset_type: "1.3.0",
        balance: LARGE,
        fee_rate: 5000
    }, {history: true, stringKey: "operation.samet_fund_create", label: "explorer.block.fund_balance"});
    assert.strictEqual(created.rows[1].value.amount, LARGE);
    assertView(64, {owner_account: account, asset_type: "1.3.0", balance: 0}, {
        history: true,
        stringKey: "operation.samet_fund_create"
    });
    assertRejected(64, {owner_account: account, asset_type: "1.3.0", balance: "12.5"});

    assertView(65, {owner_account: account, fund_id: "1.20.3"}, {
        history: true,
        stringKey: "operation.samet_fund_delete"
    });
    assertView(66, {
        owner_account: account,
        fund_id: "1.20.3",
        delta_amount: asset("-100", "1.3.0"),
        new_fee_rate: 0
    }, {history: true, stringKey: "operation.samet_fund_update", label: "explorer.block.delta_amount"});
    assertView(66, {owner_account: account, fund_id: "1.20.3"}, {
        history: true,
        stringKey: "operation.samet_fund_update"
    });
    assertView(67, {borrower: account, fund_id: "1.20.3", borrow_amount: usd}, {
        history: true,
        stringKey: "operation.samet_fund_borrow"
    });
    assert.strictEqual(
        describeRemainingOperation(op(67, {
            borrower: account,
            fund_id: "1.20.3",
            borrow_amount: usd
        })).rows[2].value.amount,
        LARGE
    );
    assertView(68, {
        account,
        fund_id: "1.20.3",
        repay_amount: bts,
        fund_fee: asset(0, "1.3.0")
    }, {history: true, stringKey: "operation.samet_fund_repay"});
    assertView(68, {account, fund_id: "1.20.3", repay_amount: bts, fund_fee: null}, {
        history: true,
        stringKey: "operation.samet_fund_repay"
    });
    assertRejected(67, {borrower: account, fund_id: "1.20.3", borrow_amount: {amount: "x", asset_id: "1.3.0"}});

    const collateral = [["1.3.0", price(1, "1.3.121", 2, "1.3.0")]];
    const borrowers = [[other, LARGE]];
    assertView(69, {
        owner_account: account,
        asset_type: "1.3.121",
        balance: LARGE,
        fee_rate: 10000,
        max_duration_seconds: 86400,
        min_deal_amount: "1000",
        enabled: true,
        auto_disable_time: "2026-12-01T00:00:00",
        acceptable_collateral: collateral,
        acceptable_borrowers: {"1.2.19": 50}
    }, {history: true, stringKey: "operation.credit_offer_create"});
    assertView(69, {
        owner_account: account,
        asset_type: "1.3.121",
        balance: 1,
        acceptable_collateral: {},
        acceptable_borrowers: []
    }, {history: true, stringKey: "operation.credit_offer_create"});
    assertRejected(69, {owner_account: account, balance: 1});

    assertView(70, {owner_account: account, offer_id: "1.21.9"}, {
        history: true,
        stringKey: "operation.credit_offer_delete"
    });
    assertView(71, {
        owner_account: account,
        offer_id: "1.21.9",
        delta_amount: bts,
        fee_rate: null,
        enabled: false,
        acceptable_collateral: "bad",
        acceptable_borrowers: borrowers
    }, {history: true, stringKey: "operation.credit_offer_update"});
    assertView(71, {owner_account: account, offer_id: "1.21.9"}, {
        history: true,
        stringKey: "operation.credit_offer_update"
    });

    assertView(72, {
        borrower: account,
        offer_id: "1.21.9",
        borrow_amount: usd,
        collateral: bts,
        max_fee_rate: 2500,
        min_duration_seconds: 60,
        extensions: {auto_repay: 1}
    }, {history: true, stringKey: "operation.credit_offer_accept"});
    assertView(72, {
        borrower: account,
        offer_id: "1.21.9",
        borrow_amount: bts,
        collateral: usd,
        extensions: []
    }, {history: true, stringKey: "operation.credit_offer_accept"});
    assertRejected(72, {borrower: account, offer_id: "1.21.9", borrow_amount: bts});

    assertView(73, {
        account,
        deal_id: "1.22.4",
        repay_amount: bts,
        credit_fee: asset(LARGE, "1.3.0")
    }, {history: true, stringKey: "operation.credit_deal_repay", label: "explorer.block.credit_fee"});
    assert.strictEqual(
        describeRemainingOperation(op(73, {
            account,
            deal_id: "1.22.4",
            repay_amount: bts,
            credit_fee: asset(LARGE, "1.3.0")
        })).summary.clauses[0].keys[0].value.amount,
        LARGE
    );

    assertView(74, {
        deal_id: "1.22.4",
        offer_id: "1.21.9",
        offer_owner: other,
        borrower: account,
        unpaid_amount: usd,
        collateral: bts,
        fee_rate: 100
    }, {history: true, stringKey: "operation.credit_deal_expired"});
    assertRejected(74, {deal_id: "1.22.4", borrower: account});

    [0, 1, 2, 9].forEach(autoRepay => {
        assertView(76, {account, deal_id: "1.22.4", auto_repay: autoRepay}, {
            history: true,
            stringKey: "operation.credit_deal_update"
        });
    });
    assertView(76, {account, deal_id: "1.22.4"}, {
        history: true,
        stringKey: "operation.credit_deal_update"
    });

    assertView(30, {
        committee_member_account: account,
        committee_member: "1.5.11",
        new_url: "https://example.invalid"
    }, {history: true, stringKey: "operation.committee_member_update"});
    assertView(30, {committee_member_account: account, committee_member: "1.5.11", new_url: null}, {
        history: true,
        stringKey: "operation.committee_member_update"
    });
    assertRejected(30, {committee_member: "1.5.11"});

    const asserted = assertView(36, {
        fee_paying_account: account,
        predicates: [
            [0, {account_id: other, name: "alice"}],
            [1, {asset_id: "1.3.0", symbol: "BTS"}],
            [2, {id: "0000000000000000000000000000000000000000"}],
            ["bad"],
            null
        ],
        required_auths: [account, other]
    }, {history: true, stringKey: "operation.assert_operation"});
    assert.ok(asserted.summary.clauses.length >= 4);
    assertView(36, {fee_paying_account: account, predicates: [], required_auths: null}, {
        history: true,
        stringKey: "operation.assert_operation"
    });
    assertRejected(36, {predicates: []});

    const fba = assertView(44, {
        account_id: account,
        fba_id: "2.16.0",
        amount: LARGE
    }, {history: true, stringKey: "operation.fba_distribute"});
    assert.strictEqual(fba.summary.params.amount, LARGE);
    assertView(44, {account_id: account, fba_id: "2.16.0"}, {
        history: true,
        stringKey: "operation.fba_distribute"
    });
    assertRejected(44, {account_id: account});

    assertView(46, {bidder: account, debt: usd, collateral: bts}, {
        history: true,
        stringKey: "operation.execute_bid",
        label: "explorer.block.debt"
    });
    assertRejected(46, {bidder: account, debt: usd, collateral: {amount: 1}});

    assertView(54, {
        account,
        enabled: true,
        valid_from: "2026-01-01T00:00:00",
        valid_to: "2027-01-01T00:00:00",
        operation_type: 0,
        auth: {weight_threshold: 1, account_auths: [[other, 1]], key_auths: []},
        restrictions: [{restriction_type: 0}]
    }, {history: true, stringKey: "operation.custom_authority_create"});
    assertView(54, {account, operation_type: 999, enabled: "yes", auth: null, restrictions: "no"}, {
        history: true,
        stringKey: "operation.custom_authority_create"
    });
    assertView(54, {account}, {
        history: true,
        stringKey: "operation.custom_authority_create_plain"
    });
    assertRejected(54, {});

    assertView(55, {
        account,
        authority_to_update: "1.17.2",
        new_enabled: false,
        new_valid_from: "2026-02-01T00:00:00",
        restrictions_to_remove: [1, 2],
        restrictions_to_add: []
    }, {history: true, stringKey: "operation.custom_authority_update"});
    assertView(55, {account, authority_to_update: "1.17.2"}, {
        history: true,
        stringKey: "operation.custom_authority_update"
    });
    assertView(56, {account, authority_to_delete: "1.17.2"}, {
        history: true,
        stringKey: "operation.custom_authority_delete"
    });
    assertRejected(56, {account});

    assertView(58, {
        account,
        ticket: "1.18.7",
        target_type: 2,
        amount_for_new_target: asset(LARGE, "1.3.0")
    }, {history: true, stringKey: "operation.ticket_update", label: "explorer.block.ticket"});
    assertView(58, {account, ticket: "1.18.7", target_type: 99, amount_for_new_target: null}, {
        history: true,
        stringKey: "operation.ticket_update"
    });
    assertRejected(58, {ticket: "1.18.7"});

    const blind = assertView(40, {
        inputs: [{commitment: "aa", owner: {weight_threshold: 1}}],
        outputs: []
    }, {history: true, stringKey: "operation.blind_transfer", label: "transaction.inputs"});
    assert.strictEqual(blind.summary.params.inputs, 1);
    assert.strictEqual(blind.summary.params.outputs, 0);
    assertView(40, {inputs: "bad", outputs: null}, {
        history: true,
        stringKey: "operation.blind_transfer"
    });
    assertView(40, {}, {history: true, stringKey: "operation.blind_transfer"});

    assertView(4, {
        order_id: "1.7.15",
        account_id: account,
        pays: bts,
        receives: usd,
        fill_price: price(1, "1.3.0", 2, "1.3.121"),
        is_maker: false
    }, {history: false, label: "explorer.block.pays"});
    assertView(4, {account_id: account, pays: asset(LARGE, "1.3.0"), receives: bts}, {
        history: false,
        label: "explorer.block.receives"
    });
    assertRejected(4, {account_id: account, pays: bts});

    assertView(18, {
        issuer: account,
        asset_to_settle: "1.3.113",
        settle_price: price(1, "1.3.113", 5, "1.3.0")
    }, {history: false, label: "explorer.block.settle_price"});
    assertRejected(18, {issuer: account, asset_to_settle: "1.3.113", settle_price: {}});

    assertView(25, {
        withdraw_from_account: account,
        authorized_account: other,
        withdrawal_limit: bts,
        withdrawal_period_sec: 86400,
        periods_until_expiration: 3,
        period_start_time: "2026-06-01T00:00:00"
    }, {history: false, label: "explorer.block.withdrawal_limit"});
    assertView(25, {withdraw_from_account: account, authorized_account: other}, {history: false});
    assertRejected(25, {withdraw_from_account: account});

    assertView(26, {
        withdraw_from_account: account,
        authorized_account: other,
        permission_to_update: "1.12.1",
        withdrawal_limit: usd
    }, {history: false, label: "explorer.block.permission"});
    assertView(27, {
        withdraw_permission: "1.12.1",
        withdraw_from_account: account,
        withdraw_to_account: other,
        amount_to_withdraw: bts,
        memo: {from: "BTS111", to: "BTS222", nonce: 1, message: "aa"}
    }, {history: false, label: "transfer.memo"});
    assertView(27, {
        withdraw_from_account: account,
        withdraw_to_account: other,
        amount_to_withdraw: bts,
        memo: null
    }, {history: false});
    assertView(28, {
        withdraw_from_account: account,
        authorized_account: other,
        withdrawal_permission: "1.12.1"
    }, {history: false});
    assertRejected(28, {withdraw_from_account: account, authorized_account: other});

    assertView(31, {new_parameters: {block_interval: 5, maintenance_interval: 86400}}, {
        history: false,
        label: "explorer.block.new_parameters"
    });
    assertView(31, {new_parameters: {}}, {history: false});
    assertRejected(31, {new_parameters: ["block_interval"]});

    [0, 1, 2, 7].forEach(policyType => {
        const policy = policyType === 0
            ? [0, {begin_timestamp: "2026-01-01T00:00:00", vesting_cliff_seconds: 10, vesting_duration_seconds: 20}]
            : policyType === 1
                ? [1, {start_claim: "2026-01-01T00:00:00", vesting_seconds: 30}]
                : policyType === 2
                    ? [2, {}]
                    : [7, {unexpected: true}];
        assertView(32, {creator: account, owner: other, amount: bts, policy}, {
            history: false,
            label: "explorer.block.vesting_policy"
        });
    });
    assertView(32, {creator: account, owner: other, amount: asset(LARGE, "1.3.0"), policy: null}, {
        history: false
    });
    assertRejected(32, {creator: account, owner: other});

    assertView(35, {
        payer: account,
        required_auths: [other],
        id: 7,
        data: [1, 2, 255]
    }, {history: false, label: "explorer.block.custom_data"});
    assertView(35, {payer: account, id: 0, data: "", required_auths: "nope"}, {history: false});
    assertRejected(35, {id: 1});

    assertView(38, {
        issuer: account,
        from: other,
        to: "1.2.19",
        amount: usd,
        memo: {message: "hi"}
    }, {history: false, label: "explorer.block.issuer"});
    assertRejected(38, {issuer: account, from: other, to: "1.2.19", amount: null});

    assertView(42, {settlement: "1.4.8", account, amount: bts}, {
        history: false,
        label: "explorer.block.settlement"
    });
    assertRejected(42, {account, amount: bts});

    assertView(51, {
        htlc_id: "1.16.4",
        from: account,
        to: other,
        redeemer: other,
        amount: bts,
        htlc_preimage_hash: [2, "abcd"],
        htlc_preimage_size: 4,
        preimage: [97, 98]
    }, {history: false, label: "htlc.preimage_hash"});
    assertView(51, {htlc_id: "1.16.4"}, {history: false, label: "htlc.id"});
    assertRejected(51, {from: account});

    assertView(53, {
        htlc_id: "1.16.4",
        to: account,
        original_htlc_recipient: other,
        htlc_amount: usd,
        htlc_preimage_hash: [0, "ef"],
        htlc_preimage_size: 2
    }, {history: false, label: "explorer.block.original_recipient"});
    assertRejected(53, {});

    assertView(57, {account, target_type: 4, amount: asset(LARGE, "1.3.0")}, {
        history: false,
        label: "explorer.block.ticket_type"
    });
    assertView(57, {account, amount: bts}, {history: false});
    assertRejected(57, {account, target_type: 1});

    [null, undefined, [], "transfer", {account}].forEach(bad => {
        assert.strictEqual(describeRemainingOperation(bad), null);
    });
    assert.strictEqual(describeRemainingOperation(op(63, {account, pool: "1.19.1"})), null);
    assert.strictEqual(describeRemainingOperation(op(77, {seller: account, order: "1.7.1"})), null);
    assert.strictEqual(describeRemainingOperation(op(59, null)), null);
    assert.strictEqual(describeRemainingOperation(op(59, [])), null);

    const explosive = {};
    Object.defineProperty(explosive, "account", {
        get() {
            throw new Error("malformed getter");
        }
    });
    explosive.asset_a = "1.3.0";
    explosive.asset_b = "1.3.1";
    explosive.share_asset = "1.3.2";
    assert.strictEqual(describeRemainingOperation(op(59, explosive)), null);
}

function lookup(data, key) {
    return key.split(".").reduce((cursor, part) => {
        if (!cursor || typeof cursor !== "object") {
            return undefined;
        }
        return cursor[part];
    }, data);
}

function collectLocaleKeys() {
    const source = fs.readFileSync(
        path.join(__dirname, "../lib/common/operationDetails.js"),
        "utf8"
    );
    const keys = new Set([
        "operation.ticket_types.liquid",
        "operation.ticket_types.lock_180_days",
        "operation.ticket_types.lock_360_days",
        "operation.ticket_types.lock_720_days",
        "operation.ticket_types.lock_forever"
    ]);
    const pattern = /"(operation(?:\.[a-z0-9_]+)+|explorer\.block\.[a-z0-9_]+|header\.account|transfer\.[a-z_]+|transaction\.[a-z_]+|htlc\.[a-z_]+)"/g;
    let match = pattern.exec(source);
    while (match) {
        keys.add(match[1]);
        match = pattern.exec(source);
    }
    return keys;
}

function testLocales() {
    const keys = collectLocaleKeys();
    assert.ok(keys.size > 40);
    ["en", "zh"].forEach(locale => {
        const data = JSON.parse(
            fs.readFileSync(
                path.join(__dirname, "../assets/locales/locale-" + locale + ".json"),
                "utf8"
            )
        );
        keys.forEach(key => {
            const value = lookup(data, key);
            assert.strictEqual(typeof value, "string", locale + " " + key);
            assert.ok(value.length, locale + " " + key);
        });
        CANONICAL.forEach(name => {
            assert.strictEqual(
                typeof data.transaction.trxTypes[name],
                "string",
                locale + " trxTypes." + name
            );
        });
        assert.strictEqual(typeof data.transaction.feeGroups.lending, "string");
        ["fee_rate", "seconds", "count", "amount", "operation"].forEach(param => {
            Object.keys(data.operation).forEach(name => {
                const text = data.operation[name];
                if (typeof text !== "string" || text.indexOf("%(" + param + ")s") === -1) {
                    return;
                }
                assert.ok(
                    text.indexOf("%(" + param + ")s") !== -1,
                    locale + " operation." + name
                );
            });
        });
    });

    const en = JSON.parse(
        fs.readFileSync(
            path.join(__dirname, "../assets/locales/locale-en.json"),
            "utf8"
        )
    );
    const zh = JSON.parse(
        fs.readFileSync(
            path.join(__dirname, "../assets/locales/locale-zh.json"),
            "utf8"
        )
    );
    [
        "liquidity_pool_create",
        "samet_fund_borrow",
        "credit_offer_accept",
        "credit_deal_expired",
        "blind_transfer",
        "execute_bid",
        "custom_authority_create",
        "ticket_update"
    ].forEach(key => {
        assert.notStrictEqual(en.operation[key], zh.operation[key], key);
        assert.notStrictEqual(
            en.transaction.trxTypes[key],
            zh.transaction.trxTypes[key],
            key
        );
    });
}

function loadBabelParser() {
    try {
        return require("@babel/parser");
    } catch (error) {
        const target = path.join(
            require("os").tmpdir(),
            "bitshares-ui-babel-parser"
        );
        const entry = path.join(target, "node_modules", "@babel", "parser");
        if (!fs.existsSync(entry)) {
            fs.mkdirSync(target, {recursive: true});
            require("child_process").execFileSync(
                "npm",
                [
                    "install",
                    "--prefix",
                    target,
                    "@babel/parser@7.26.10",
                    "--no-save",
                    "--no-package-lock",
                    "--silent"
                ],
                {stdio: "inherit"}
            );
        }
        return require(entry);
    }
}

function testBabelParse() {
    const parser = loadBabelParser();
    const files = [
        "../lib/common/operationNames.js",
        "../lib/common/operationDetails.js",
        "../components/Blockchain/operations/DescribedOperation.jsx",
        "../components/Blockchain/operations/index.js",
        "../components/Blockchain/OperationAnt.js",
        "../components/Blockchain/Transaction.jsx",
        "../components/Blockchain/Fees.jsx",
        "../components/Account/RecentTransactions.jsx"
    ];
    files.forEach(relativePath => {
        const filename = path.join(__dirname, relativePath);
        const source = fs.readFileSync(filename, "utf8");
        parser.parse(source, {
            sourceType: "module",
            plugins: [
                "jsx",
                "classProperties",
                "classPrivateProperties",
                "classPrivateMethods",
                "dynamicImport",
                "optionalChaining",
                "nullishCoalescingOperator",
                "objectRestSpread",
                "exportDefaultFrom",
                "decorators-legacy"
            ]
        });
    });
}

testMapping();
testParsers();
testLocales();
testBabelParse();
console.log("operations 0-77 checks passed");
