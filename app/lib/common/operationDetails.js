/**
 * Parsers for BitShares operations that the account-history or block view
 * did not render. Field names follow bitshares-core master
 * libraries/protocol/include/graphene/protocol/*.hpp.
 *
 * A parser returns null when the body is missing the fields required to
 * describe the operation. Optional fields that are absent, null, or the wrong
 * shape are skipped. Amounts above Number.MAX_SAFE_INTEGER stay digit strings.
 * Nothing here throws: the caller falls back to a block link or the raw JSON.
 *
 * History summaries are produced only for operations that had no account
 * history renderer. Block rows are produced for those plus operations that
 * already had a history line but no block table.
 */

const GRAPHENE_PERCENT_DIVISOR = 100;
const FEE_RATE_DIVISOR = 10000;
const LIST_LIMIT = 6;

const CORE_OPERATION_NAMES = [
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

const TICKET_TYPES = [
    "liquid",
    "lock_180_days",
    "lock_360_days",
    "lock_720_days",
    "lock_forever"
];

const AUTO_REPAY = [
    "operation.credit_auto_repay_none",
    "operation.credit_auto_repay_full",
    "operation.credit_auto_repay_partial"
];

const HASH_ALGOS = ["ripemd160", "sha1", "sha256", "hash160"];

const HISTORY_OPERATION_IDS = {
    30: true,
    36: true,
    40: true,
    44: true,
    46: true,
    54: true,
    55: true,
    56: true,
    58: true,
    59: true,
    60: true,
    64: true,
    65: true,
    66: true,
    67: true,
    68: true,
    69: true,
    70: true,
    71: true,
    72: true,
    73: true,
    74: true,
    75: true,
    76: true
};

const BLOCK_OPERATION_IDS = {
    4: true,
    18: true,
    25: true,
    26: true,
    27: true,
    28: true,
    30: true,
    31: true,
    32: true,
    35: true,
    36: true,
    38: true,
    40: true,
    42: true,
    44: true,
    46: true,
    51: true,
    53: true,
    54: true,
    55: true,
    56: true,
    57: true,
    58: true,
    59: true,
    60: true,
    64: true,
    65: true,
    66: true,
    67: true,
    68: true,
    69: true,
    70: true,
    71: true,
    72: true,
    73: true,
    74: true,
    75: true,
    76: true
};

function readId(value) {
    return typeof value === "string" && value ? value : null;
}

function readShare(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string" && /^-?\d+$/.test(value)) {
        return value;
    }
    return null;
}

function readSmallInt(value) {
    if (typeof value === "number" && Number.isInteger(value)) {
        return value;
    }
    if (typeof value === "string" && /^-?\d+$/.test(value)) {
        const parsed = Number(value);
        if (Number.isSafeInteger(parsed)) {
            return parsed;
        }
    }
    return null;
}

function readBool(value) {
    return typeof value === "boolean" ? value : null;
}

function readText(value) {
    return typeof value === "string" && value ? value : null;
}

function readAsset(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    if (typeof value.asset_id !== "string" || !value.asset_id) {
        return null;
    }
    const amount = readShare(value.amount);
    if (amount == null) {
        return null;
    }
    return {amount, asset_id: value.asset_id};
}

function readPrice(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    const base = readAsset(value.base);
    const quote = readAsset(value.quote);
    if (!base || !quote) {
        return null;
    }
    return {base, quote};
}

function shareAmount(share, assetId) {
    if (share == null || !assetId) {
        return null;
    }
    return {amount: share, asset_id: assetId};
}

function formatScaledPercent(value, divisor) {
    let numeric = value;
    if (typeof numeric === "string" && /^-?\d+$/.test(numeric)) {
        if (numeric.replace("-", "").length > 15) {
            return null;
        }
        numeric = Number(numeric);
    }
    if (typeof numeric !== "number" || !Number.isFinite(numeric)) {
        return null;
    }
    const text = (numeric / divisor)
        .toFixed(4)
        .replace(/0+$/, "")
        .replace(/\.$/, "");
    return text + "%";
}

function formatGraphenePercent(value) {
    return formatScaledPercent(value, GRAPHENE_PERCENT_DIVISOR);
}

function formatFeeRate(value) {
    return formatScaledPercent(value, FEE_RATE_DIVISOR);
}

function readPairs(value) {
    if (value == null) {
        return null;
    }
    if (Array.isArray(value)) {
        const pairs = [];
        value.forEach(entry => {
            if (Array.isArray(entry) && entry.length >= 2) {
                pairs.push(entry);
            }
        });
        return pairs;
    }
    if (typeof value === "object") {
        return Object.keys(value).map(key => [key, value[key]]);
    }
    return null;
}

function previewBytes(value) {
    if (typeof value === "string") {
        return value.length > 80 ? value.slice(0, 80) + "..." : value;
    }
    if (!Array.isArray(value)) {
        return null;
    }
    const bytes = value.every(
        item => typeof item === "number" && item >= 0 && item <= 255 && item === (item | 0)
    );
    if (!bytes) {
        return String(value.length);
    }
    const hex = value
        .map(item => item.toString(16).padStart(2, "0"))
        .join("");
    return hex.length > 80 ? hex.slice(0, 80) + "..." : hex;
}

function compactJson(value) {
    try {
        const text = JSON.stringify(value);
        if (typeof text !== "string") {
            return null;
        }
        return text.length > 160 ? text.slice(0, 157) + "..." : text;
    } catch (error) {
        return null;
    }
}

function describeHash(value) {
    if (!Array.isArray(value) || value.length < 2) {
        return null;
    }
    const algo =
        HASH_ALGOS[readSmallInt(value[0])] ||
        "#" + String(value[0]);
    const digest = previewBytes(value[1]);
    return digest ? algo + " " + digest : algo;
}

function accountKey(arg, id) {
    return {type: "account", value: id, arg};
}

function amountKey(arg, asset) {
    return {type: "amount", value: asset, arg};
}

function assetKey(arg, id) {
    return {type: "asset", value: id, arg};
}

function textKey(arg, value) {
    return {value: String(value), arg};
}

function priceKey(arg, price) {
    return {type: "price", value: price, arg};
}

function translateKey(arg, content) {
    return {type: "translate", value: content, arg};
}

function accountRow(label, id) {
    return {label, kind: "account", value: id};
}

function amountRow(label, asset) {
    return {label, kind: "amount", value: asset};
}

function assetRow(label, id) {
    return {label, kind: "asset", value: id};
}

function textRow(label, value) {
    return {label, kind: "text", value: String(value)};
}

function priceRow(label, price) {
    return {
        label,
        kind: "price",
        base: price.base,
        quote: price.quote
    };
}

function boolRow(label, value) {
    return {label, kind: "bool", value: value};
}

function translateRow(label, content, params) {
    return {label, kind: "translate", content, params: params || {}};
}

function clause(stringKey, keys, params) {
    return {stringKey, keys: keys || [], params: params || {}};
}

function sentence(stringKey, keys, params, clauses) {
    return {
        stringKey,
        keys: keys || [],
        params: params || {},
        clauses: clauses || []
    };
}

function view(color, summary, rows) {
    return {color, summary, rows};
}

function blockOnly(color, rows) {
    return {color, summary: null, rows};
}

function capClauses(clauses) {
    if (clauses.length <= LIST_LIMIT) {
        return clauses;
    }
    return clauses.slice(0, LIST_LIMIT).concat([
        clause("operation.more_items", [], {
            count: clauses.length - LIST_LIMIT
        })
    ]);
}

function pushOptional(list, item) {
    if (item) {
        list.push(item);
    }
}

function feeRateClause(value) {
    const rate = formatFeeRate(value);
    if (!rate) {
        return null;
    }
    return clause("operation.fee_rate", [], {rate});
}

function durationClause(value, stringKey) {
    const seconds = readSmallInt(value);
    if (seconds == null || seconds < 0) {
        return null;
    }
    return clause(stringKey, [], {seconds: String(seconds)});
}

function stateClause(value, enabledKey, disabledKey) {
    const enabled = readBool(value);
    if (enabled == null) {
        return null;
    }
    return clause(enabled ? enabledKey : disabledKey);
}

function autoRepayClause(value) {
    const index = readSmallInt(value);
    if (index == null) {
        return null;
    }
    if (AUTO_REPAY[index]) {
        return clause(AUTO_REPAY[index]);
    }
    return clause("operation.credit_auto_repay_unknown", [], {
        type: String(index)
    });
}

function collateralClauses(pairs) {
    if (!pairs) {
        return [];
    }
    const clauses = [];
    pairs.forEach(pair => {
        const assetId = readId(pair[0]);
        const price = readPrice(pair[1]);
        if (!assetId || !price) {
            return;
        }
        clauses.push(
            clause("operation.credit_collateral", [
                assetKey("asset", assetId),
                priceKey("price", price)
            ])
        );
    });
    return capClauses(clauses);
}

function borrowerClauses(pairs, assetId) {
    if (!pairs) {
        return [];
    }
    const clauses = [];
    pairs.forEach(pair => {
        const account = readId(pair[0]);
        const limit = readShare(pair[1]);
        if (!account || limit == null) {
            return;
        }
        if (assetId) {
            clauses.push(
                clause("operation.credit_borrower", [
                    accountKey("account", account),
                    amountKey("limit", shareAmount(limit, assetId))
                ])
            );
        } else {
            clauses.push(
                clause(
                    "operation.credit_borrower_raw",
                    [accountKey("account", account)],
                    {limit: String(limit)}
                )
            );
        }
    });
    return capClauses(clauses);
}

function collateralRows(pairs) {
    if (!pairs) {
        return [];
    }
    const rows = [];
    pairs.slice(0, 12).forEach(pair => {
        const assetId = readId(pair[0]);
        const price = readPrice(pair[1]);
        if (assetId) {
            rows.push(assetRow("explorer.block.collateral_asset", assetId));
        }
        if (price) {
            rows.push(priceRow("explorer.block.collateral_price", price));
        }
    });
    return rows;
}

function borrowerRows(pairs, assetId) {
    if (!pairs) {
        return [];
    }
    const rows = [];
    pairs.slice(0, 12).forEach(pair => {
        const account = readId(pair[0]);
        const limit = readShare(pair[1]);
        if (account) {
            rows.push(accountRow("explorer.block.borrower", account));
        }
        if (limit != null && assetId) {
            rows.push(
                amountRow(
                    "explorer.block.borrower_limit",
                    shareAmount(limit, assetId)
                )
            );
        } else if (limit != null) {
            rows.push(textRow("explorer.block.borrower_limit", String(limit)));
        }
    });
    return rows;
}

function poolFeeClauses(body) {
    const clauses = [];
    const taker = formatGraphenePercent(body.taker_fee_percent);
    const withdrawal = formatGraphenePercent(body.withdrawal_fee_percent);
    if (taker) {
        clauses.push(clause("operation.pool_taker_fee", [], {fee: taker}));
    }
    if (withdrawal) {
        clauses.push(
            clause("operation.pool_withdrawal_fee", [], {fee: withdrawal})
        );
    }
    return clauses;
}

function poolFeeRows(body) {
    const rows = [];
    const taker = formatGraphenePercent(body.taker_fee_percent);
    const withdrawal = formatGraphenePercent(body.withdrawal_fee_percent);
    if (taker) {
        rows.push(textRow("explorer.block.taker_fee_percent", taker));
    }
    if (withdrawal) {
        rows.push(textRow("explorer.block.withdrawal_fee_percent", withdrawal));
    }
    return rows;
}

function ticketTypeKey(value) {
    const index = readSmallInt(value);
    if (index == null || !TICKET_TYPES[index]) {
        return null;
    }
    return "operation.ticket_types." + TICKET_TYPES[index];
}

function operationTypeLabel(value) {
    const index = readSmallInt(value);
    if (index == null) {
        return null;
    }
    return CORE_OPERATION_NAMES[index] || String(index);
}

function authorityClause(auth) {
    if (!auth || typeof auth !== "object" || Array.isArray(auth)) {
        return null;
    }
    const threshold = readSmallInt(auth.weight_threshold);
    const accounts = Array.isArray(auth.account_auths)
        ? auth.account_auths.length
        : 0;
    const keys = Array.isArray(auth.key_auths) ? auth.key_auths.length : 0;
    if (threshold == null && accounts === 0 && keys === 0) {
        return null;
    }
    return clause("operation.authority_summary", [], {
        threshold: threshold == null ? "-" : String(threshold),
        accounts: String(accounts),
        keys: String(keys)
    });
}

function countClause(value, stringKey) {
    if (!Array.isArray(value)) {
        return null;
    }
    return clause(stringKey, [], {count: value.length});
}

function accountIdRows(label, value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map(readId)
        .filter(Boolean)
        .slice(0, 8)
        .map(id => accountRow(label, id));
}

function predicateParts(list) {
    if (!Array.isArray(list)) {
        return {clauses: [], rows: []};
    }
    const clauses = [];
    const rows = [];
    list.forEach(entry => {
        const type = Array.isArray(entry) ? readSmallInt(entry[0]) : null;
        const payload =
            Array.isArray(entry) && entry[1] && typeof entry[1] === "object"
                ? entry[1]
                : null;
        if (
            type === 0 &&
            payload &&
            readId(payload.account_id) &&
            typeof payload.name === "string"
        ) {
            clauses.push(
                clause(
                    "operation.assert_account_name",
                    [accountKey("account", payload.account_id)],
                    {name: payload.name}
                )
            );
            rows.push(accountRow("header.account", payload.account_id));
            rows.push(textRow("explorer.block.expected_name", payload.name));
            return;
        }
        if (
            type === 1 &&
            payload &&
            readId(payload.asset_id) &&
            typeof payload.symbol === "string"
        ) {
            clauses.push(
                clause(
                    "operation.assert_asset_symbol",
                    [assetKey("asset", payload.asset_id)],
                    {symbol: payload.symbol}
                )
            );
            rows.push(assetRow("explorer.block.asset", payload.asset_id));
            rows.push(textRow("explorer.block.expected_symbol", payload.symbol));
            return;
        }
        if (
            type === 2 &&
            payload &&
            (typeof payload.id === "string" || typeof payload.id === "number")
        ) {
            clauses.push(
                clause("operation.assert_block", [], {id: String(payload.id)})
            );
            rows.push(textRow("explorer.block.block_id", String(payload.id)));
            return;
        }
        clauses.push(
            clause("operation.assert_unknown", [], {
                type: type == null ? "?" : String(type)
            })
        );
    });
    return {clauses: capClauses(clauses), rows};
}

function policyRow(policy) {
    if (!Array.isArray(policy)) {
        return null;
    }
    const type = readSmallInt(policy[0]);
    const payload =
        policy[1] && typeof policy[1] === "object" && !Array.isArray(policy[1])
            ? policy[1]
            : {};
    if (type === 0) {
        return translateRow(
            "explorer.block.vesting_policy",
            "operation.vesting_linear",
            {
                begin: readText(payload.begin_timestamp) || "-",
                cliff:
                    payload.vesting_cliff_seconds != null
                        ? String(payload.vesting_cliff_seconds)
                        : "-",
                duration:
                    payload.vesting_duration_seconds != null
                        ? String(payload.vesting_duration_seconds)
                        : "-"
            }
        );
    }
    if (type === 1) {
        return translateRow(
            "explorer.block.vesting_policy",
            "operation.vesting_cdd",
            {
                start: readText(payload.start_claim) || "-",
                seconds:
                    payload.vesting_seconds != null
                        ? String(payload.vesting_seconds)
                        : "-"
            }
        );
    }
    if (type === 2) {
        return translateRow(
            "explorer.block.vesting_policy",
            "operation.vesting_instant"
        );
    }
    return translateRow(
        "explorer.block.vesting_policy",
        "operation.vesting_unknown",
        {type: type == null ? "?" : String(type)}
    );
}

function hashRow(value) {
    const text = describeHash(value);
    if (!text) {
        return null;
    }
    return textRow("htlc.preimage_hash", text);
}

function preimageRow(value) {
    const text = previewBytes(value);
    if (!text) {
        return null;
    }
    return textRow("htlc.preimage", text);
}

function extensionAutoRepay(body) {
    const ext = body.extensions;
    if (!ext || typeof ext !== "object" || Array.isArray(ext)) {
        return null;
    }
    if (!Object.prototype.hasOwnProperty.call(ext, "auto_repay")) {
        return null;
    }
    return readSmallInt(ext.auto_repay);
}

function memoRow(memo) {
    if (!memo || typeof memo !== "object") {
        return null;
    }
    return translateRow("transfer.memo", "operation.memo_attached");
}

function parameterRow(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    const keys = Object.keys(value);
    if (!keys.length) {
        return textRow("explorer.block.new_parameters", "-");
    }
    const shown = keys.slice(0, 8).join(", ");
    return textRow(
        "explorer.block.new_parameters",
        keys.length > 8 ? shown + "..." : shown
    );
}

function parseLiquidityPoolCreate(body) {
    const account = readId(body.account);
    const assetA = readId(body.asset_a);
    const assetB = readId(body.asset_b);
    const share = readId(body.share_asset);
    if (!account || !assetA || !assetB || !share) {
        return null;
    }
    return view(
        "success",
        sentence(
            "operation.liquidity_pool_create",
            [
                accountKey("account", account),
                assetKey("asset_a", assetA),
                assetKey("asset_b", assetB),
                assetKey("share", share)
            ],
            {},
            poolFeeClauses(body)
        ),
        [
            accountRow("header.account", account),
            assetRow("explorer.block.asset_a", assetA),
            assetRow("explorer.block.asset_b", assetB),
            assetRow("explorer.block.share_asset", share)
        ].concat(poolFeeRows(body))
    );
}

function parseLiquidityPoolDelete(body) {
    const account = readId(body.account);
    const pool = readId(body.pool);
    if (!account || !pool) {
        return null;
    }
    return view(
        "warning",
        sentence("operation.liquidity_pool_delete", [
            accountKey("account", account),
            textKey("id", pool)
        ]),
        [
            accountRow("header.account", account),
            textRow("explorer.block.liquidity_pool", pool)
        ]
    );
}

function parseLiquidityPoolUpdate(body) {
    const account = readId(body.account);
    const pool = readId(body.pool);
    if (!account || !pool) {
        return null;
    }
    return view(
        "warning",
        sentence(
            "operation.liquidity_pool_update",
            [accountKey("account", account), textKey("id", pool)],
            {},
            poolFeeClauses(body)
        ),
        [
            accountRow("header.account", account),
            textRow("explorer.block.liquidity_pool", pool)
        ].concat(poolFeeRows(body))
    );
}

function parseSametFundCreate(body) {
    const account = readId(body.owner_account);
    const assetId = readId(body.asset_type);
    const balance = readShare(body.balance);
    if (!account || !assetId || balance == null) {
        return null;
    }
    const amount = shareAmount(balance, assetId);
    const clauses = [];
    pushOptional(clauses, feeRateClause(body.fee_rate));
    const rows = [
        accountRow("header.account", account),
        amountRow("explorer.block.fund_balance", amount)
    ];
    const rate = formatFeeRate(body.fee_rate);
    if (rate) {
        rows.push(textRow("explorer.block.fee_rate", rate));
    }
    return view(
        "success",
        sentence(
            "operation.samet_fund_create",
            [accountKey("account", account), amountKey("amount", amount)],
            {},
            clauses
        ),
        rows
    );
}

function parseSametFundDelete(body) {
    const account = readId(body.owner_account);
    const fund = readId(body.fund_id);
    if (!account || !fund) {
        return null;
    }
    return view(
        "warning",
        sentence("operation.samet_fund_delete", [
            accountKey("account", account),
            textKey("id", fund)
        ]),
        [accountRow("header.account", account), textRow("explorer.block.samet_fund", fund)]
    );
}

function parseSametFundUpdate(body) {
    const account = readId(body.owner_account);
    const fund = readId(body.fund_id);
    if (!account || !fund) {
        return null;
    }
    const delta = readAsset(body.delta_amount);
    const clauses = [];
    if (delta) {
        clauses.push(
            clause("operation.balance_delta", [amountKey("amount", delta)])
        );
    }
    pushOptional(clauses, feeRateClause(body.new_fee_rate));
    const rows = [
        accountRow("header.account", account),
        textRow("explorer.block.samet_fund", fund)
    ];
    if (delta) {
        rows.push(amountRow("explorer.block.delta_amount", delta));
    }
    const rate = formatFeeRate(body.new_fee_rate);
    if (rate) {
        rows.push(textRow("explorer.block.fee_rate", rate));
    }
    return view(
        "warning",
        sentence(
            "operation.samet_fund_update",
            [accountKey("account", account), textKey("id", fund)],
            {},
            clauses
        ),
        rows
    );
}

function parseSametFundBorrow(body) {
    const account = readId(body.borrower);
    const fund = readId(body.fund_id);
    const amount = readAsset(body.borrow_amount);
    if (!account || !fund || !amount) {
        return null;
    }
    return view(
        "warning",
        sentence("operation.samet_fund_borrow", [
            accountKey("account", account),
            amountKey("amount", amount),
            textKey("id", fund)
        ]),
        [
            accountRow("header.account", account),
            textRow("explorer.block.samet_fund", fund),
            amountRow("explorer.block.borrow_amount", amount)
        ]
    );
}

function parseSametFundRepay(body) {
    const account = readId(body.account);
    const fund = readId(body.fund_id);
    const amount = readAsset(body.repay_amount);
    if (!account || !fund || !amount) {
        return null;
    }
    const fundFee = readAsset(body.fund_fee);
    const clauses = [];
    if (fundFee) {
        clauses.push(
            clause("operation.fund_fee", [amountKey("amount", fundFee)])
        );
    }
    const rows = [
        accountRow("header.account", account),
        textRow("explorer.block.samet_fund", fund),
        amountRow("explorer.block.repay_amount", amount)
    ];
    if (fundFee) {
        rows.push(amountRow("explorer.block.fund_fee", fundFee));
    }
    return view(
        "success",
        sentence(
            "operation.samet_fund_repay",
            [
                accountKey("account", account),
                amountKey("amount", amount),
                textKey("id", fund)
            ],
            {},
            clauses
        ),
        rows
    );
}

function creditOfferCommonRows(account, offerId, body, assetId) {
    const rows = [accountRow("header.account", account)];
    if (offerId) {
        rows.push(textRow("explorer.block.credit_offer", offerId));
    }
    const delta = readAsset(body.delta_amount);
    if (delta) {
        rows.push(amountRow("explorer.block.delta_amount", delta));
    }
    const rate = formatFeeRate(body.fee_rate);
    if (rate) {
        rows.push(textRow("explorer.block.fee_rate", rate));
    }
    const minDeal = shareAmount(readShare(body.min_deal_amount), assetId);
    if (minDeal) {
        rows.push(amountRow("explorer.block.min_deal_amount", minDeal));
    } else if (readShare(body.min_deal_amount) != null) {
        rows.push(
            textRow(
                "explorer.block.min_deal_amount",
                String(readShare(body.min_deal_amount))
            )
        );
    }
    const seconds = readSmallInt(body.max_duration_seconds);
    if (seconds != null && seconds >= 0) {
        rows.push(textRow("explorer.block.max_duration", String(seconds)));
    }
    const enabled = readBool(body.enabled);
    if (enabled != null) {
        rows.push(boolRow("explorer.block.enabled", enabled));
    }
    if (readText(body.auto_disable_time)) {
        rows.push(
            textRow("explorer.block.auto_disable_time", body.auto_disable_time)
        );
    }
    return rows
        .concat(collateralRows(readPairs(body.acceptable_collateral)))
        .concat(borrowerRows(readPairs(body.acceptable_borrowers), assetId));
}

function creditOfferClauses(body, assetId) {
    const clauses = [];
    const delta = readAsset(body.delta_amount);
    if (delta) {
        clauses.push(
            clause("operation.balance_delta", [amountKey("amount", delta)])
        );
    }
    pushOptional(clauses, feeRateClause(body.fee_rate));
    const minDeal = shareAmount(readShare(body.min_deal_amount), assetId);
    if (minDeal) {
        clauses.push(
            clause("operation.credit_min_deal", [amountKey("amount", minDeal)])
        );
    }
    pushOptional(
        clauses,
        durationClause(body.max_duration_seconds, "operation.credit_max_duration")
    );
    pushOptional(
        clauses,
        stateClause(
            body.enabled,
            "operation.credit_enabled",
            "operation.credit_disabled"
        )
    );
    if (readText(body.auto_disable_time)) {
        clauses.push(
            clause("operation.credit_auto_disable", [], {
                time: body.auto_disable_time
            })
        );
    }
    return clauses
        .concat(collateralClauses(readPairs(body.acceptable_collateral)))
        .concat(borrowerClauses(readPairs(body.acceptable_borrowers), assetId));
}

function parseCreditOfferCreate(body) {
    const account = readId(body.owner_account);
    const assetId = readId(body.asset_type);
    const balance = readShare(body.balance);
    if (!account || !assetId || balance == null) {
        return null;
    }
    const amount = shareAmount(balance, assetId);
    return view(
        "success",
        sentence(
            "operation.credit_offer_create",
            [accountKey("account", account), amountKey("amount", amount)],
            {},
            creditOfferClauses(body, assetId)
        ),
        [
            accountRow("header.account", account),
            amountRow("explorer.block.fund_balance", amount)
        ].concat(creditOfferCommonRows(account, null, body, assetId).slice(1))
    );
}

function parseCreditOfferDelete(body) {
    const account = readId(body.owner_account);
    const offer = readId(body.offer_id);
    if (!account || !offer) {
        return null;
    }
    return view(
        "warning",
        sentence("operation.credit_offer_delete", [
            accountKey("account", account),
            textKey("id", offer)
        ]),
        [
            accountRow("header.account", account),
            textRow("explorer.block.credit_offer", offer)
        ]
    );
}

function parseCreditOfferUpdate(body) {
    const account = readId(body.owner_account);
    const offer = readId(body.offer_id);
    if (!account || !offer) {
        return null;
    }
    return view(
        "warning",
        sentence(
            "operation.credit_offer_update",
            [accountKey("account", account), textKey("id", offer)],
            {},
            creditOfferClauses(body, null)
        ),
        creditOfferCommonRows(account, offer, body, null)
    );
}

function parseCreditOfferAccept(body) {
    const account = readId(body.borrower);
    const offer = readId(body.offer_id);
    const amount = readAsset(body.borrow_amount);
    const collateral = readAsset(body.collateral);
    if (!account || !offer || !amount || !collateral) {
        return null;
    }
    const clauses = [];
    const maxFeeClause = formatFeeRate(body.max_fee_rate);
    if (maxFeeClause) {
        clauses.push(
            clause("operation.credit_max_fee_rate", [], {rate: maxFeeClause})
        );
    }
    pushOptional(
        clauses,
        durationClause(
            body.min_duration_seconds,
            "operation.credit_min_duration"
        )
    );
    pushOptional(clauses, autoRepayClause(extensionAutoRepay(body)));
    const rows = [
        accountRow("header.account", account),
        textRow("explorer.block.credit_offer", offer),
        amountRow("explorer.block.borrow_amount", amount),
        amountRow("explorer.block.collateral", collateral)
    ];
    const maxFee = formatFeeRate(body.max_fee_rate);
    if (maxFee) {
        rows.push(textRow("explorer.block.max_fee_rate", maxFee));
    }
    const seconds = readSmallInt(body.min_duration_seconds);
    if (seconds != null && seconds >= 0) {
        rows.push(textRow("explorer.block.min_duration", String(seconds)));
    }
    const repay = autoRepayClause(extensionAutoRepay(body));
    if (repay) {
        rows.push(
            translateRow("explorer.block.auto_repay", repay.stringKey, repay.params)
        );
    }
    return view(
        "warning",
        sentence(
            "operation.credit_offer_accept",
            [
                accountKey("account", account),
                amountKey("amount", amount),
                textKey("id", offer),
                amountKey("collateral", collateral)
            ],
            {},
            clauses
        ),
        rows
    );
}

function parseCreditDealRepay(body) {
    const account = readId(body.account);
    const deal = readId(body.deal_id);
    const amount = readAsset(body.repay_amount);
    if (!account || !deal || !amount) {
        return null;
    }
    const creditFee = readAsset(body.credit_fee);
    const clauses = [];
    if (creditFee) {
        clauses.push(
            clause("operation.credit_fee", [amountKey("amount", creditFee)])
        );
    }
    const rows = [
        accountRow("header.account", account),
        textRow("explorer.block.credit_deal", deal),
        amountRow("explorer.block.repay_amount", amount)
    ];
    if (creditFee) {
        rows.push(amountRow("explorer.block.credit_fee", creditFee));
    }
    return view(
        "success",
        sentence(
            "operation.credit_deal_repay",
            [
                accountKey("account", account),
                amountKey("amount", amount),
                textKey("id", deal)
            ],
            {},
            clauses
        ),
        rows
    );
}

function parseCreditDealExpired(body) {
    const deal = readId(body.deal_id);
    const borrower = readId(body.borrower);
    const owner = readId(body.offer_owner);
    const unpaid = readAsset(body.unpaid_amount);
    const collateral = readAsset(body.collateral);
    if (!deal || !borrower || !owner || !unpaid || !collateral) {
        return null;
    }
    const clauses = [];
    pushOptional(clauses, feeRateClause(body.fee_rate));
    const rows = [
        textRow("explorer.block.credit_deal", deal),
        accountRow("explorer.block.borrower", borrower),
        accountRow("explorer.block.offer_owner", owner),
        amountRow("explorer.block.unpaid_amount", unpaid),
        amountRow("explorer.block.collateral", collateral)
    ];
    if (readId(body.offer_id)) {
        rows.splice(1, 0, textRow("explorer.block.credit_offer", body.offer_id));
    }
    const rate = formatFeeRate(body.fee_rate);
    if (rate) {
        rows.push(textRow("explorer.block.fee_rate", rate));
    }
    return view(
        "warning",
        sentence(
            "operation.credit_deal_expired",
            [
                accountKey("borrower", borrower),
                textKey("id", deal),
                amountKey("unpaid", unpaid),
                accountKey("owner", owner),
                amountKey("collateral", collateral)
            ],
            {},
            clauses
        ),
        rows
    );
}

function parseCreditDealUpdate(body) {
    const account = readId(body.account);
    const deal = readId(body.deal_id);
    if (!account || !deal) {
        return null;
    }
    const repay = autoRepayClause(body.auto_repay);
    const rows = [
        accountRow("header.account", account),
        textRow("explorer.block.credit_deal", deal)
    ];
    if (repay) {
        rows.push(
            translateRow("explorer.block.auto_repay", repay.stringKey, repay.params)
        );
    } else if (body.auto_repay != null) {
        rows.push(textRow("explorer.block.auto_repay", String(body.auto_repay)));
    }
    return view(
        "info",
        sentence(
            "operation.credit_deal_update",
            [accountKey("account", account), textKey("id", deal)],
            {},
            repay ? [repay] : []
        ),
        rows
    );
}

function parseCommitteeMemberUpdate(body) {
    const account = readId(body.committee_member_account);
    const member = readId(body.committee_member);
    if (!account || !member) {
        return null;
    }
    const url = readText(body.new_url);
    const clauses = [];
    if (url) {
        clauses.push(clause("operation.committee_member_url", [], {url}));
    }
    const rows = [
        accountRow("header.account", account),
        textRow("explorer.block.committee_member", member)
    ];
    if (url) {
        rows.push(textRow("transaction.new_url", url));
    }
    return view(
        "info",
        sentence(
            "operation.committee_member_update",
            [accountKey("account", account), textKey("id", member)],
            {},
            clauses
        ),
        rows
    );
}

function parseAssert(body) {
    const account = readId(body.fee_paying_account);
    if (!account) {
        return null;
    }
    const predicates = predicateParts(body.predicates);
    const rows = [accountRow("header.account", account)]
        .concat(predicates.rows)
        .concat(accountIdRows("explorer.block.required_auth", body.required_auths));
    const authCount = Array.isArray(body.required_auths)
        ? body.required_auths.length
        : 0;
    return view(
        "info",
        sentence(
            "operation.assert_operation",
            [accountKey("account", account)],
            {count: predicates.clauses.length},
            predicates.clauses.concat(
                authCount
                    ? [clause("operation.required_auths", [], {count: authCount})]
                    : []
            )
        ),
        rows
    );
}

function parseFbaDistribute(body) {
    const account = readId(body.account_id);
    const fba = readId(body.fba_id);
    if (!account || !fba) {
        return null;
    }
    const amount = readShare(body.amount);
    const rows = [
        accountRow("header.account", account),
        textRow("explorer.block.fba", fba)
    ];
    if (amount != null) {
        rows.push(textRow("explorer.block.distribution_amount", String(amount)));
    }
    return view(
        "success",
        sentence(
            "operation.fba_distribute",
            [accountKey("account", account), textKey("fba", fba)],
            {amount: amount == null ? "-" : String(amount)}
        ),
        rows
    );
}

function parseExecuteBid(body) {
    const account = readId(body.bidder);
    const debt = readAsset(body.debt);
    const collateral = readAsset(body.collateral);
    if (!account || !debt || !collateral) {
        return null;
    }
    return view(
        "warning",
        sentence("operation.execute_bid", [
            accountKey("account", account),
            amountKey("debt", debt),
            amountKey("collateral", collateral)
        ]),
        [
            accountRow("header.account", account),
            amountRow("explorer.block.debt", debt),
            amountRow("explorer.block.collateral", collateral)
        ]
    );
}

function parseCustomAuthorityCreate(body) {
    const account = readId(body.account);
    if (!account) {
        return null;
    }
    const operation = operationTypeLabel(body.operation_type);
    const clauses = [];
    pushOptional(
        clauses,
        stateClause(
            body.enabled,
            "operation.authority_enabled",
            "operation.authority_disabled"
        )
    );
    if (readText(body.valid_from) || readText(body.valid_to)) {
        clauses.push(
            clause("operation.custom_authority_window", [], {
                from: readText(body.valid_from) || "-",
                to: readText(body.valid_to) || "-"
            })
        );
    }
    pushOptional(clauses, authorityClause(body.auth));
    pushOptional(
        clauses,
        countClause(body.restrictions, "operation.custom_authority_restrictions")
    );
    const rows = [accountRow("header.account", account)];
    if (operation) {
        rows.push(textRow("explorer.block.authorized_operation", operation));
    }
    const enabled = readBool(body.enabled);
    if (enabled != null) {
        rows.push(boolRow("explorer.block.enabled", enabled));
    }
    if (readText(body.valid_from)) {
        rows.push(textRow("explorer.block.valid_from", body.valid_from));
    }
    if (readText(body.valid_to)) {
        rows.push(textRow("explorer.block.valid_to", body.valid_to));
    }
    const auth = authorityClause(body.auth);
    if (auth) {
        rows.push(
            translateRow("explorer.block.authority", auth.stringKey, auth.params)
        );
    }
    if (Array.isArray(body.restrictions)) {
        rows.push(
            textRow("explorer.block.restrictions", String(body.restrictions.length))
        );
    }
    const stringKey = operation
        ? "operation.custom_authority_create"
        : "operation.custom_authority_create_plain";
    return view(
        "success",
        sentence(
            stringKey,
            [accountKey("account", account)],
            operation ? {operation} : {},
            clauses
        ),
        rows
    );
}

function parseCustomAuthorityUpdate(body) {
    const account = readId(body.account);
    const authority = readId(body.authority_to_update);
    if (!account || !authority) {
        return null;
    }
    const clauses = [];
    pushOptional(
        clauses,
        stateClause(
            body.new_enabled,
            "operation.authority_enabled",
            "operation.authority_disabled"
        )
    );
    if (readText(body.new_valid_from) || readText(body.new_valid_to)) {
        clauses.push(
            clause("operation.custom_authority_window", [], {
                from: readText(body.new_valid_from) || "-",
                to: readText(body.new_valid_to) || "-"
            })
        );
    }
    pushOptional(clauses, authorityClause(body.new_auth));
    pushOptional(
        clauses,
        countClause(
            body.restrictions_to_remove,
            "operation.custom_authority_removed"
        )
    );
    pushOptional(
        clauses,
        countClause(body.restrictions_to_add, "operation.custom_authority_added")
    );
    const rows = [
        accountRow("header.account", account),
        textRow("explorer.block.custom_authority", authority)
    ];
    const enabled = readBool(body.new_enabled);
    if (enabled != null) {
        rows.push(boolRow("explorer.block.enabled", enabled));
    }
    if (readText(body.new_valid_from)) {
        rows.push(textRow("explorer.block.valid_from", body.new_valid_from));
    }
    if (readText(body.new_valid_to)) {
        rows.push(textRow("explorer.block.valid_to", body.new_valid_to));
    }
    if (Array.isArray(body.restrictions_to_remove)) {
        rows.push(
            textRow(
                "explorer.block.restrictions_removed",
                String(body.restrictions_to_remove.length)
            )
        );
    }
    if (Array.isArray(body.restrictions_to_add)) {
        rows.push(
            textRow(
                "explorer.block.restrictions_added",
                String(body.restrictions_to_add.length)
            )
        );
    }
    return view(
        "warning",
        sentence(
            "operation.custom_authority_update",
            [accountKey("account", account), textKey("id", authority)],
            {},
            clauses
        ),
        rows
    );
}

function parseCustomAuthorityDelete(body) {
    const account = readId(body.account);
    const authority = readId(body.authority_to_delete);
    if (!account || !authority) {
        return null;
    }
    return view(
        "warning",
        sentence("operation.custom_authority_delete", [
            accountKey("account", account),
            textKey("id", authority)
        ]),
        [
            accountRow("header.account", account),
            textRow("explorer.block.custom_authority", authority)
        ]
    );
}

function parseTicketUpdate(body) {
    const account = readId(body.account);
    const ticket = readId(body.ticket);
    if (!account || !ticket) {
        return null;
    }
    const typeKey = ticketTypeKey(body.target_type);
    const amount = readAsset(body.amount_for_new_target);
    const clauses = [];
    if (typeKey) {
        clauses.push(clause("operation.ticket_target", [translateKey("type", typeKey)]));
    }
    if (amount) {
        clauses.push(
            clause("operation.ticket_update_amount", [amountKey("amount", amount)])
        );
    }
    const rows = [
        accountRow("header.account", account),
        textRow("explorer.block.ticket", ticket)
    ];
    if (typeKey) {
        rows.push(translateRow("explorer.block.ticket_type", typeKey));
    } else if (readSmallInt(body.target_type) != null) {
        rows.push(
            textRow("explorer.block.ticket_type", String(readSmallInt(body.target_type)))
        );
    }
    if (amount) {
        rows.push(amountRow("explorer.block.split_amount", amount));
    }
    return view(
        "warning",
        sentence(
            "operation.ticket_update",
            [accountKey("account", account), textKey("id", ticket)],
            {},
            clauses
        ),
        rows
    );
}

function parseBlindTransfer(body) {
    const inputs = Array.isArray(body.inputs) ? body.inputs : [];
    const outputs = Array.isArray(body.outputs) ? body.outputs : [];
    const rows = [
        textRow("transaction.inputs", String(inputs.length)),
        textRow("transaction.outputs", String(outputs.length))
    ];
    if (inputs[0] && typeof inputs[0] === "object") {
        const preview = compactJson(inputs[0]);
        if (preview) {
            rows.push(textRow("explorer.block.blind_input", preview));
        }
    }
    if (outputs[0] && typeof outputs[0] === "object") {
        const preview = compactJson(outputs[0]);
        if (preview) {
            rows.push(textRow("explorer.block.blind_output", preview));
        }
    }
    return view(
        "info",
        sentence("operation.blind_transfer", [], {
            inputs: inputs.length,
            outputs: outputs.length
        }),
        rows
    );
}

function parseFillOrder(body) {
    const account = readId(body.account_id);
    const pays = readAsset(body.pays);
    const receives = readAsset(body.receives);
    if (!account || !pays || !receives) {
        return null;
    }
    const rows = [
        accountRow("header.account", account),
        amountRow("explorer.block.pays", pays),
        amountRow("explorer.block.receives", receives)
    ];
    if (readId(body.order_id)) {
        rows.splice(1, 0, textRow("transaction.order_id", body.order_id));
    }
    const price = readPrice(body.fill_price);
    if (price) {
        rows.push(priceRow("explorer.block.fill_price", price));
    }
    if (readBool(body.is_maker) != null) {
        rows.push(boolRow("explorer.block.is_maker", body.is_maker));
    }
    return blockOnly("success", rows);
}

function parseAssetGlobalSettle(body) {
    const account = readId(body.issuer);
    const asset = readId(body.asset_to_settle);
    const price = readPrice(body.settle_price);
    if (!account || !asset || !price) {
        return null;
    }
    return blockOnly("warning", [
        accountRow("header.account", account),
        assetRow("explorer.block.settle_asset", asset),
        priceRow("explorer.block.settle_price", price)
    ]);
}

function withdrawLimitRows(body) {
    const rows = [];
    const limit = readAsset(body.withdrawal_limit);
    if (limit) {
        rows.push(amountRow("explorer.block.withdrawal_limit", limit));
    }
    const period = readSmallInt(body.withdrawal_period_sec);
    if (period != null) {
        rows.push(textRow("explorer.block.withdrawal_period", String(period)));
    }
    const periods = readSmallInt(body.periods_until_expiration);
    if (periods != null) {
        rows.push(textRow("explorer.block.periods", String(periods)));
    }
    if (readText(body.period_start_time)) {
        rows.push(textRow("explorer.block.period_start", body.period_start_time));
    }
    return rows;
}

function parseWithdrawPermissionCreate(body) {
    const from = readId(body.withdraw_from_account);
    const authorized = readId(body.authorized_account);
    if (!from || !authorized) {
        return null;
    }
    return blockOnly(
        "info",
        [
            accountRow("transfer.from", from),
            accountRow("explorer.block.authorized_account", authorized)
        ].concat(withdrawLimitRows(body))
    );
}

function parseWithdrawPermissionUpdate(body) {
    const from = readId(body.withdraw_from_account);
    const authorized = readId(body.authorized_account);
    const permission = readId(body.permission_to_update);
    if (!from || !authorized || !permission) {
        return null;
    }
    return blockOnly(
        "info",
        [
            accountRow("transfer.from", from),
            accountRow("explorer.block.authorized_account", authorized),
            textRow("explorer.block.permission", permission)
        ].concat(withdrawLimitRows(body))
    );
}

function parseWithdrawPermissionClaim(body) {
    const from = readId(body.withdraw_from_account);
    const to = readId(body.withdraw_to_account);
    const amount = readAsset(body.amount_to_withdraw);
    if (!from || !to || !amount) {
        return null;
    }
    const rows = [
        accountRow("transfer.from", from),
        accountRow("transfer.to", to),
        amountRow("transfer.amount", amount)
    ];
    if (readId(body.withdraw_permission)) {
        rows.unshift(textRow("explorer.block.permission", body.withdraw_permission));
    }
    const memo = memoRow(body.memo);
    if (memo) {
        rows.push(memo);
    }
    return blockOnly("success", rows);
}

function parseWithdrawPermissionDelete(body) {
    const from = readId(body.withdraw_from_account);
    const authorized = readId(body.authorized_account);
    const permission = readId(body.withdrawal_permission);
    if (!from || !authorized || !permission) {
        return null;
    }
    return blockOnly("warning", [
        accountRow("transfer.from", from),
        accountRow("explorer.block.authorized_account", authorized),
        textRow("explorer.block.permission", permission)
    ]);
}

function parseCommitteeGlobal(body) {
    const parameters = parameterRow(body.new_parameters);
    if (!parameters) {
        return null;
    }
    return blockOnly("info", [
        accountRow("header.account", "1.2.0"),
        parameters
    ]);
}

function parseVestingBalanceCreate(body) {
    const creator = readId(body.creator);
    const owner = readId(body.owner);
    const amount = readAsset(body.amount);
    if (!creator || !owner || !amount) {
        return null;
    }
    const rows = [
        accountRow("explorer.block.vesting_creator", creator),
        accountRow("explorer.block.vesting_owner", owner),
        amountRow("transfer.amount", amount)
    ];
    const policy = policyRow(body.policy);
    if (policy) {
        rows.push(policy);
    }
    return blockOnly("info", rows);
}

function parseCustom(body) {
    const payer = readId(body.payer);
    if (!payer) {
        return null;
    }
    const rows = [accountRow("explorer.block.custom_payer", payer)];
    const customId = readSmallInt(body.id);
    if (customId != null) {
        rows.push(textRow("explorer.block.custom_id", String(customId)));
    }
    rows.push.apply(
        rows,
        accountIdRows("explorer.block.required_auth", body.required_auths)
    );
    const data = previewBytes(body.data);
    if (data) {
        rows.push(textRow("explorer.block.custom_data", data));
    }
    return blockOnly("info", rows);
}

function parseOverrideTransfer(body) {
    const issuer = readId(body.issuer);
    const from = readId(body.from);
    const to = readId(body.to);
    const amount = readAsset(body.amount);
    if (!issuer || !from || !to || !amount) {
        return null;
    }
    const rows = [
        accountRow("explorer.block.issuer", issuer),
        accountRow("transfer.from", from),
        accountRow("transfer.to", to),
        amountRow("transfer.amount", amount)
    ];
    const memo = memoRow(body.memo);
    if (memo) {
        rows.push(memo);
    }
    return blockOnly("warning", rows);
}

function parseAssetSettleCancel(body) {
    const account = readId(body.account);
    const amount = readAsset(body.amount);
    const settlement = readId(body.settlement);
    if (!account || !amount || !settlement) {
        return null;
    }
    return blockOnly("warning", [
        accountRow("header.account", account),
        amountRow("transfer.amount", amount),
        textRow("explorer.block.settlement", settlement)
    ]);
}

function parseHtlcRedeemed(body) {
    const htlc = readId(body.htlc_id);
    if (!htlc) {
        return null;
    }
    const rows = [textRow("htlc.id", htlc)];
    if (readId(body.from)) {
        rows.push(accountRow("transfer.from", body.from));
    }
    if (readId(body.to)) {
        rows.push(accountRow("transfer.to", body.to));
    }
    if (readId(body.redeemer)) {
        rows.push(accountRow("htlc.redeemer", body.redeemer));
    }
    const amount = readAsset(body.amount);
    if (amount) {
        rows.push(amountRow("transfer.amount", amount));
    }
    const hash = hashRow(body.htlc_preimage_hash);
    if (hash) {
        rows.push(hash);
    }
    const size = readSmallInt(body.htlc_preimage_size);
    if (size != null) {
        rows.push(textRow("explorer.block.preimage_size", String(size)));
    }
    const preimage = preimageRow(body.preimage);
    if (preimage) {
        rows.push(preimage);
    }
    return blockOnly("success", rows);
}

function parseHtlcRefund(body) {
    const htlc = readId(body.htlc_id);
    if (!htlc) {
        return null;
    }
    const rows = [textRow("htlc.id", htlc)];
    if (readId(body.to)) {
        rows.push(accountRow("transfer.to", body.to));
    }
    if (readId(body.original_htlc_recipient)) {
        rows.push(
            accountRow(
                "explorer.block.original_recipient",
                body.original_htlc_recipient
            )
        );
    }
    const amount = readAsset(body.htlc_amount);
    if (amount) {
        rows.push(amountRow("transfer.amount", amount));
    }
    const hash = hashRow(body.htlc_preimage_hash);
    if (hash) {
        rows.push(hash);
    }
    const size = readSmallInt(body.htlc_preimage_size);
    if (size != null) {
        rows.push(textRow("explorer.block.preimage_size", String(size)));
    }
    return blockOnly("warning", rows);
}

function parseTicketCreate(body) {
    const account = readId(body.account);
    const amount = readAsset(body.amount);
    if (!account || !amount) {
        return null;
    }
    const rows = [
        accountRow("header.account", account),
        amountRow("transfer.amount", amount)
    ];
    const typeKey = ticketTypeKey(body.target_type);
    if (typeKey) {
        rows.push(translateRow("explorer.block.ticket_type", typeKey));
    } else if (readSmallInt(body.target_type) != null) {
        rows.push(
            textRow(
                "explorer.block.ticket_type",
                String(readSmallInt(body.target_type))
            )
        );
    }
    return blockOnly("info", rows);
}

const PARSERS = {
    4: parseFillOrder,
    18: parseAssetGlobalSettle,
    25: parseWithdrawPermissionCreate,
    26: parseWithdrawPermissionUpdate,
    27: parseWithdrawPermissionClaim,
    28: parseWithdrawPermissionDelete,
    30: parseCommitteeMemberUpdate,
    31: parseCommitteeGlobal,
    32: parseVestingBalanceCreate,
    35: parseCustom,
    36: parseAssert,
    38: parseOverrideTransfer,
    40: parseBlindTransfer,
    42: parseAssetSettleCancel,
    44: parseFbaDistribute,
    46: parseExecuteBid,
    51: parseHtlcRedeemed,
    53: parseHtlcRefund,
    54: parseCustomAuthorityCreate,
    55: parseCustomAuthorityUpdate,
    56: parseCustomAuthorityDelete,
    57: parseTicketCreate,
    58: parseTicketUpdate,
    59: parseLiquidityPoolCreate,
    60: parseLiquidityPoolDelete,
    64: parseSametFundCreate,
    65: parseSametFundDelete,
    66: parseSametFundUpdate,
    67: parseSametFundBorrow,
    68: parseSametFundRepay,
    69: parseCreditOfferCreate,
    70: parseCreditOfferDelete,
    71: parseCreditOfferUpdate,
    72: parseCreditOfferAccept,
    73: parseCreditDealRepay,
    74: parseCreditDealExpired,
    75: parseLiquidityPoolUpdate,
    76: parseCreditDealUpdate
};

export function coreOperationNames() {
    return CORE_OPERATION_NAMES.slice();
}

export function isHistoryOperation(id) {
    return !!HISTORY_OPERATION_IDS[id];
}

export function isBlockOperation(id) {
    return !!BLOCK_OPERATION_IDS[id];
}

export function describeRemainingOperation(op) {
    if (!Array.isArray(op) || !Object.prototype.hasOwnProperty.call(PARSERS, op[0])) {
        return null;
    }
    const body = op[1];
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return null;
    }
    try {
        return PARSERS[op[0]](body) || null;
    } catch (error) {
        return null;
    }
}

export function historyOperationSummary(op) {
    if (!op || !isHistoryOperation(op[0])) {
        return null;
    }
    const described = describeRemainingOperation(op);
    if (!described || !described.summary) {
        return null;
    }
    return described;
}

export function blockOperationRows(op) {
    if (!op || !isBlockOperation(op[0])) {
        return null;
    }
    const described = describeRemainingOperation(op);
    if (!described || !described.rows || !described.rows.length) {
        return null;
    }
    return described;
}
