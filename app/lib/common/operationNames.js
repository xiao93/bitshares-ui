/**
 * Bitsharesjs ChainTypes.operations stops at ticket_update (58). Block and
 * history views resolve a numeric operation id with
 * Object.keys(ChainTypes.operations)[id], so later ids never match a renderer
 * and the page dumps the raw operation. Names are filled in by id, which keeps
 * 0..58 stable and does not depend on key insertion order.
 *
 * 59 liquidity_pool_create
 * 60 liquidity_pool_delete
 * 61 liquidity_pool_deposit
 * 62 liquidity_pool_withdraw
 * 63 liquidity_pool_exchange
 * 64 samet_fund_create
 * 65 samet_fund_delete
 * 66 samet_fund_update
 * 67 samet_fund_borrow
 * 68 samet_fund_repay
 * 69 credit_offer_create
 * 70 credit_offer_delete
 * 71 credit_offer_update
 * 72 credit_offer_accept
 * 73 credit_deal_repay
 * 74 credit_deal_expired
 * 75 liquidity_pool_update
 * 76 credit_deal_update
 * 77 limit_order_update
 *
 * Ids 0..58 stay on the bitsharesjs ChainTypes list. Filling the holes above
 * does not move 61, 62, 63, or 77.
 */

export const LIQUIDITY_POOL_DEPOSIT_ID = 61;
export const LIQUIDITY_POOL_WITHDRAW_ID = 62;
export const LIQUIDITY_POOL_EXCHANGE_ID = 63;

const OPERATION_NAMES_BY_ID = {
    59: "liquidity_pool_create",
    60: "liquidity_pool_delete",
    61: "liquidity_pool_deposit",
    62: "liquidity_pool_withdraw",
    63: "liquidity_pool_exchange",
    64: "samet_fund_create",
    65: "samet_fund_delete",
    66: "samet_fund_update",
    67: "samet_fund_borrow",
    68: "samet_fund_repay",
    69: "credit_offer_create",
    70: "credit_offer_delete",
    71: "credit_offer_update",
    72: "credit_offer_accept",
    73: "credit_deal_repay",
    74: "credit_deal_expired",
    75: "liquidity_pool_update",
    76: "credit_deal_update",
    77: "limit_order_update"
};

function isAsset(value) {
    return !!value && value.amount != null && typeof value.asset_id === "string";
}

export function buildOperationNames(baseNames) {
    const names = baseNames.slice();
    Object.keys(OPERATION_NAMES_BY_ID).forEach(key => {
        const index = parseInt(key, 10);
        if (names[index] == null) {
            names[index] = OPERATION_NAMES_BY_ID[index];
        }
    });
    return names;
}

/**
 * Read a liquidity_pool_exchange operation.
 *
 * `op` is the [id, body] pair returned by get_block. `result`, when present,
 * is an operation result. Account history stores a
 * generic_exchange_operation_result as:
 *   [4, {paid: [asset], received: [asset], fees: [asset, asset, asset]}]
 * get_block on current public nodes leaves operation_results empty, so the
 * block view has to render amount_to_sell and min_to_receive from the body.
 */
export function describeLiquidityPoolExchange(op, result) {
    if (!op || op[0] !== LIQUIDITY_POOL_EXCHANGE_ID || !op[1]) {
        return null;
    }

    const body = op[1];
    if (
        typeof body.account !== "string" ||
        typeof body.pool !== "string" ||
        !isAsset(body.amount_to_sell) ||
        !isAsset(body.min_to_receive)
    ) {
        return null;
    }

    const described = {
        account: body.account,
        pool: body.pool,
        amountToSell: body.amount_to_sell,
        minToReceive: body.min_to_receive,
        fee: isAsset(body.fee) ? body.fee : null,
        paid: null,
        received: null,
        fees: null
    };

    const payload = Array.isArray(result) ? result[1] : null;
    if (payload && Array.isArray(payload.paid) && isAsset(payload.paid[0])) {
        described.paid = payload.paid[0];
    }
    if (
        payload &&
        Array.isArray(payload.received) &&
        isAsset(payload.received[0])
    ) {
        described.received = payload.received[0];
    }
    if (payload && Array.isArray(payload.fees)) {
        described.fees = payload.fees.filter(isAsset);
    }

    return described;
}

export function liquidityPoolExchangeSummary(op, result) {
    const view = describeLiquidityPoolExchange(op, result);
    if (!view) {
        return null;
    }

    const actual = view.paid && view.received;
    return {
        stringKey: actual
            ? "operation.liquidity_pool_exchange"
            : "operation.liquidity_pool_exchange_limit",
        account: view.account,
        pool: view.pool,
        amountA: actual ? view.paid : view.amountToSell,
        amountB: actual ? view.received : view.minToReceive,
        view
    };
}

/**
 * Rows for the block / transaction table. Labels are locale keys.
 * Price uses the same base/quote orientation as limit_order_create.
 */
export function liquidityPoolExchangeRows(op, result) {
    const view = describeLiquidityPoolExchange(op, result);
    if (!view) {
        return null;
    }

    const rows = [
        {label: "header.account", kind: "account", value: view.account},
        {
            label: "explorer.block.liquidity_pool",
            kind: "text",
            value: view.pool
        },
        {label: "exchange.sell", kind: "amount", value: view.amountToSell},
        {
            label: "transaction.min_receive",
            kind: "amount",
            value: view.minToReceive
        },
        {
            label: "exchange.price",
            kind: "price",
            base: view.amountToSell,
            quote: view.minToReceive
        }
    ];

    if (view.paid) {
        rows.push({
            label: "explorer.block.amount_paid",
            kind: "amount",
            value: view.paid
        });
    }
    if (view.received) {
        rows.push({
            label: "explorer.block.amount_received",
            kind: "amount",
            value: view.received
        });
    }

    return rows;
}

/**
 * Deposit and withdraw share generic_exchange_operation_result (result id 4):
 *   [4, {paid: [asset, ...], received: [asset, ...], fees: [asset, ...]}]
 *
 * Deposit body: fee, account, pool, amount_a, amount_b, extensions.
 * The pool takes only as much as the current ratio allows, so paid can be
 * smaller than the amounts in the body. received is the share asset issued.
 * fees is empty on mainnet deposits.
 *
 * Withdraw body: fee, account, pool, share_amount, extensions.
 * paid is the share asset burned. received is asset A then asset B, after the
 * withdrawal fee. fees is that fee on A then on B (zero when the pool's
 * withdrawal fee percent is zero, or when the withdrawal empties the pool).
 *
 * get_block sometimes returns those results and sometimes an empty
 * operation_results array. Amounts above Number.MAX_SAFE_INTEGER arrive as
 * digit strings (iobanker-core's deposit offered "34817770000000022" BTS) and
 * are kept as strings so the value is not rounded.
 */

function readPoolAsset(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    if (typeof value.asset_id !== "string" || !value.asset_id) {
        return null;
    }
    const amount = value.amount;
    if (typeof amount === "number") {
        if (!Number.isFinite(amount)) {
            return null;
        }
        return {amount, asset_id: value.asset_id};
    }
    if (typeof amount === "string" && /^-?\d+$/.test(amount)) {
        return {amount, asset_id: value.asset_id};
    }
    return null;
}

function readPoolAssetList(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.map(readPoolAsset).filter(Boolean);
}

function readPoolResult(result) {
    const payload =
        Array.isArray(result) &&
        result[1] &&
        typeof result[1] === "object" &&
        !Array.isArray(result[1])
            ? result[1]
            : null;
    if (!payload) {
        return {paid: [], received: [], fees: []};
    }
    return {
        paid: readPoolAssetList(payload.paid),
        received: readPoolAssetList(payload.received),
        fees: readPoolAssetList(payload.fees)
    };
}

function poolAccount(value) {
    return typeof value === "string" && value ? value : null;
}

function samePoolAsset(a, b) {
    return (
        !!a &&
        !!b &&
        a.asset_id === b.asset_id &&
        String(a.amount) === String(b.amount)
    );
}

function nonzeroPoolAsset(asset) {
    return !!asset && asset.amount !== 0 && asset.amount !== "0";
}

function amountKey(arg, asset) {
    return {type: "amount", value: asset, arg};
}

function poolSummaryKeys(view, extras) {
    return [
        {type: "account", value: view.account, arg: "account"},
        {value: view.pool, arg: "id"}
    ].concat(extras);
}

export function describeLiquidityPoolDeposit(op, result) {
    if (
        !op ||
        op[0] !== LIQUIDITY_POOL_DEPOSIT_ID ||
        !op[1] ||
        typeof op[1] !== "object"
    ) {
        return null;
    }
    const body = op[1];
    const account = poolAccount(body.account);
    const pool = poolAccount(body.pool);
    const amountA = readPoolAsset(body.amount_a);
    const amountB = readPoolAsset(body.amount_b);
    if (!account || !pool || !amountA || !amountB) {
        return null;
    }
    const exchange = readPoolResult(result);
    return {
        account,
        pool,
        amountA,
        amountB,
        fee: readPoolAsset(body.fee),
        paid: exchange.paid,
        received: exchange.received,
        fees: exchange.fees
    };
}

export function liquidityPoolDepositSummary(op, result) {
    const view = describeLiquidityPoolDeposit(op, result);
    if (!view) {
        return null;
    }
    const paidA = view.paid[0];
    const paidB = view.paid[1];
    const share = view.received[0];
    let stringKey = "operation.liquidity_pool_deposit_offer";
    let amountA = view.amountA;
    let amountB = view.amountB;
    let shareAmount = null;
    if (paidA && paidB) {
        amountA = paidA;
        amountB = paidB;
        stringKey = share
            ? "operation.liquidity_pool_deposit"
            : "operation.liquidity_pool_deposit_paid";
        shareAmount = share;
    } else if (share) {
        stringKey = "operation.liquidity_pool_deposit";
        shareAmount = share;
    }
    const extras = [
        amountKey("amount_a", amountA),
        amountKey("amount_b", amountB)
    ];
    if (shareAmount) {
        extras.push(amountKey("share", shareAmount));
    }
    return {
        stringKey,
        keys: poolSummaryKeys(view, extras),
        fees: view.fees.filter(nonzeroPoolAsset),
        view
    };
}

export function liquidityPoolDepositRows(op, result) {
    const view = describeLiquidityPoolDeposit(op, result);
    if (!view) {
        return null;
    }
    const rows = [
        {label: "header.account", kind: "account", value: view.account},
        {
            label: "explorer.block.liquidity_pool",
            kind: "text",
            value: view.pool
        },
        {label: "explorer.block.asset_a", kind: "amount", value: view.amountA},
        {label: "explorer.block.asset_b", kind: "amount", value: view.amountB}
    ];
    view.paid.forEach(asset => {
        rows.push({
            label: "explorer.block.amount_paid",
            kind: "amount",
            value: asset
        });
    });
    view.received.forEach(asset => {
        rows.push({
            label: "explorer.block.amount_received",
            kind: "amount",
            value: asset
        });
    });
    view.fees.filter(nonzeroPoolAsset).forEach(asset => {
        rows.push({
            label: "explorer.block.pool_fee",
            kind: "amount",
            value: asset
        });
    });
    return rows;
}

export function describeLiquidityPoolWithdraw(op, result) {
    if (
        !op ||
        op[0] !== LIQUIDITY_POOL_WITHDRAW_ID ||
        !op[1] ||
        typeof op[1] !== "object"
    ) {
        return null;
    }
    const body = op[1];
    const account = poolAccount(body.account);
    const pool = poolAccount(body.pool);
    const shareAmount = readPoolAsset(body.share_amount);
    if (!account || !pool || !shareAmount) {
        return null;
    }
    const exchange = readPoolResult(result);
    return {
        account,
        pool,
        shareAmount,
        fee: readPoolAsset(body.fee),
        paid: exchange.paid,
        received: exchange.received,
        fees: exchange.fees
    };
}

export function liquidityPoolWithdrawSummary(op, result) {
    const view = describeLiquidityPoolWithdraw(op, result);
    if (!view) {
        return null;
    }
    const receivedA = view.received[0];
    const receivedB = view.received[1];
    let stringKey = "operation.liquidity_pool_withdraw";
    const extras = [amountKey("share", view.shareAmount)];
    if (receivedA && receivedB) {
        stringKey = "operation.liquidity_pool_withdraw_received";
        extras.push(
            amountKey("amount_a", receivedA),
            amountKey("amount_b", receivedB)
        );
    } else if (receivedA) {
        stringKey = "operation.liquidity_pool_withdraw_one";
        extras.push(amountKey("amount_a", receivedA));
    }
    return {
        stringKey,
        keys: poolSummaryKeys(view, extras),
        fees: view.fees.filter(nonzeroPoolAsset),
        view
    };
}

export function liquidityPoolWithdrawRows(op, result) {
    const view = describeLiquidityPoolWithdraw(op, result);
    if (!view) {
        return null;
    }
    const rows = [
        {label: "header.account", kind: "account", value: view.account},
        {
            label: "explorer.block.liquidity_pool",
            kind: "text",
            value: view.pool
        },
        {
            label: "explorer.block.share_amount",
            kind: "amount",
            value: view.shareAmount
        }
    ];
    view.paid.forEach(asset => {
        if (!samePoolAsset(asset, view.shareAmount)) {
            rows.push({
                label: "explorer.block.amount_paid",
                kind: "amount",
                value: asset
            });
        }
    });
    view.received.forEach(asset => {
        rows.push({
            label: "explorer.block.amount_received",
            kind: "amount",
            value: asset
        });
    });
    view.fees.filter(nonzeroPoolAsset).forEach(asset => {
        rows.push({
            label: "explorer.block.pool_fee",
            kind: "amount",
            value: asset
        });
    });
    return rows;
}

/**
 * Operation id 77 is limit_order_update.
 *
 * ChainTypes.operations still ends at ticket_update (58). Id 77 is filled in
 * here, beside id 63, without moving 0..58. BitShares Core defines the body as
 * fee, seller, order, and optional new_price, delta_amount_to_sell,
 * new_expiration, on_fill, plus extensions. Unset optionals are omitted.
 * on_fill, when present, is a list of static variants; type 0 is
 * create_take_profit_order_action. An empty on_fill list clears those actions.
 * The operation result is void_result, [0, {}].
 *
 * Percent fields use GRAPHENE_100_PERCENT (10000 = 100%).
 */
export const LIMIT_ORDER_UPDATE_ID = 77;

const OPERATION_IDS_BY_NAME = {};
Object.keys(OPERATION_NAMES_BY_ID).forEach(key => {
    OPERATION_IDS_BY_NAME[OPERATION_NAMES_BY_ID[key]] = parseInt(key, 10);
});

const GRAPHENE_PERCENT = 100;

function finiteAmount(amount) {
    if (typeof amount === "number" && Number.isFinite(amount)) {
        return amount;
    }
    if (typeof amount === "string" && /^-?\d+$/.test(amount)) {
        const parsed = Number(amount);
        if (Number.isSafeInteger(parsed)) {
            return parsed;
        }
    }
    return null;
}

function readAsset(value) {
    if (!value || typeof value.asset_id !== "string" || !value.asset_id) {
        return null;
    }
    const amount = finiteAmount(value.amount);
    if (amount == null) {
        return null;
    }
    return {amount, asset_id: value.asset_id};
}

function readPrice(value) {
    if (!value || typeof value !== "object") {
        return null;
    }
    const base = readAsset(value.base);
    const quote = readAsset(value.quote);
    if (!base || !quote) {
        return null;
    }
    return {base, quote};
}

function formatGraphenePercent(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return null;
    }
    const text = (parsed / GRAPHENE_PERCENT).toFixed(4)
        .replace(/0+$/, "")
        .replace(/\.$/, "");
    return text + "%";
}

function readOnFill(value) {
    if (!Array.isArray(value)) {
        return null;
    }
    const actions = value
        .map(entry => {
            if (!Array.isArray(entry) || entry.length < 2) {
                return null;
            }
            const typeIndex = finiteAmount(entry[0]);
            const payload = entry[1];
            if (typeIndex == null || !payload || typeof payload !== "object") {
                return null;
            }
            if (typeIndex !== 0) {
                return {typeIndex, known: false};
            }
            const expirationSeconds = finiteAmount(payload.expiration_seconds);
            return {
                typeIndex,
                known: true,
                feeAssetId:
                    typeof payload.fee_asset_id === "string"
                        ? payload.fee_asset_id
                        : null,
                spreadPercent: finiteAmount(payload.spread_percent),
                spread: formatGraphenePercent(payload.spread_percent),
                sizePercent: finiteAmount(payload.size_percent),
                size: formatGraphenePercent(payload.size_percent),
                expirationSeconds,
                repeat:
                    typeof payload.repeat === "boolean" ? payload.repeat : null
            };
        })
        .filter(Boolean);
    if (value.length > 0 && actions.length === 0) {
        return [{typeIndex: null, known: false}];
    }
    return actions;
}

function optionalString(value) {
    return typeof value === "string" && value ? value : null;
}

/**
 * Read a limit_order_update operation. Returns null when the id or the
 * required seller/order fields are missing. Optional fields that are absent,
 * null, or the wrong shape are left null so the caller can skip them.
 * `onFill` is null when the field is absent, and an array (possibly empty)
 * when the operation sets it.
 */
export function describeLimitOrderUpdate(op) {
    if (!op || op[0] !== LIMIT_ORDER_UPDATE_ID || !op[1]) {
        return null;
    }
    const body = op[1];
    if (typeof body.seller !== "string" || typeof body.order !== "string") {
        return null;
    }
    if (!body.seller || !body.order) {
        return null;
    }

    return {
        seller: body.seller,
        order: body.order,
        fee: readAsset(body.fee),
        newPrice: readPrice(body.new_price),
        deltaAmountToSell: readAsset(body.delta_amount_to_sell),
        newExpiration: optionalString(body.new_expiration),
        onFill: readOnFill(body.on_fill)
    };
}

export function operationTypeId(name, baseOperations) {
    if (
        baseOperations &&
        Object.prototype.hasOwnProperty.call(baseOperations, name) &&
        baseOperations[name] != null
    ) {
        return baseOperations[name];
    }
    return OPERATION_IDS_BY_NAME[name];
}

/**
 * Rows for the block / transaction table. Labels are locale keys.
 * new_price keeps the operation's base/quote orientation.
 */
export function limitOrderUpdateRows(op) {
    const view = describeLimitOrderUpdate(op);
    if (!view) {
        return null;
    }

    const rows = [
        {label: "transaction.seller", kind: "account", value: view.seller},
        {label: "transaction.order_id", kind: "text", value: view.order}
    ];

    if (view.newPrice) {
        rows.push({
            label: "explorer.block.new_price",
            kind: "price",
            base: view.newPrice.base,
            quote: view.newPrice.quote
        });
    }
    if (view.deltaAmountToSell) {
        rows.push({
            label: "explorer.block.delta_amount",
            kind: "amount",
            value: view.deltaAmountToSell
        });
    }
    if (view.newExpiration) {
        rows.push({
            label: "explorer.block.new_expiration",
            kind: "text",
            value: view.newExpiration
        });
    }
    if (view.onFill) {
        if (!view.onFill.length) {
            rows.push({
                label: "explorer.block.on_fill",
                kind: "on_fill_clear"
            });
        } else {
            view.onFill.forEach(action => {
                rows.push({
                    label: "explorer.block.on_fill",
                    kind: "on_fill",
                    value: action
                });
            });
        }
    }

    return rows;
}
