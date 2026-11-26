/**
 * Operation id 63 is liquidity_pool_exchange.
 *
 * The bitsharesjs revision pinned by this UI (ChainTypes.operations) stops at
 * ticket_update (58). Block and history views resolve a numeric operation id
 * with Object.keys(ChainTypes.operations)[id], so id 63 never matches a
 * renderer and the block page dumps the raw operation. Names are filled in by
 * id, which keeps 0..58 stable and does not depend on key insertion order.
 */

export const LIQUIDITY_POOL_EXCHANGE_ID = 63;

const OPERATION_NAMES_BY_ID = {
    63: "liquidity_pool_exchange",
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

const OPERATION_IDS_BY_NAME = {
    liquidity_pool_exchange: LIQUIDITY_POOL_EXCHANGE_ID,
    limit_order_update: LIMIT_ORDER_UPDATE_ID
};

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
