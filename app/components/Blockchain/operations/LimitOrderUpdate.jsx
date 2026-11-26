import React from "react";
import Translate from "react-translate-component";
import counterpart from "counterpart";
import TranslateWithLinks from "../../Utility/TranslateWithLinks";
import {describeLimitOrderUpdate} from "common/operationNames";

function repeatLabel(repeat) {
    return counterpart.translate(
        repeat
            ? "operation.limit_order_update_repeats"
            : "operation.limit_order_update_once"
    );
}

function OnFillDetail({action}) {
    if (!action.known) {
        return (
            <Translate
                content="operation.limit_order_update_on_fill_unknown"
                type={action.typeIndex}
            />
        );
    }
    return (
        <Translate
            content="operation.limit_order_update_on_fill_detail"
            spread={action.spread || ""}
            size={action.size || ""}
            seconds={
                action.expirationSeconds != null ? action.expirationSeconds : ""
            }
            repeat={action.repeat == null ? "" : repeatLabel(action.repeat)}
        />
    );
}

export const LimitOrderUpdate = ({op, changeColor}) => {
    const view = describeLimitOrderUpdate(op);
    if (!view) {
        return null;
    }
    if (changeColor) {
        changeColor("warning");
    }

    const order = view.order.split(".").pop();

    return (
        <span>
            <TranslateWithLinks
                string="operation.limit_order_update"
                keys={[
                    {
                        type: "account",
                        value: view.seller,
                        arg: "account"
                    }
                ]}
                params={{order}}
            />
            {view.newPrice ? (
                <React.Fragment>
                    {", "}
                    <TranslateWithLinks
                        string="operation.limit_order_update_price"
                        keys={[
                            {
                                type: "price",
                                value: view.newPrice,
                                arg: "price"
                            }
                        ]}
                    />
                </React.Fragment>
            ) : null}
            {view.deltaAmountToSell ? (
                <React.Fragment>
                    {", "}
                    <TranslateWithLinks
                        string="operation.limit_order_update_delta"
                        keys={[
                            {
                                type: "amount",
                                value: view.deltaAmountToSell,
                                arg: "amount"
                            }
                        ]}
                    />
                </React.Fragment>
            ) : null}
            {view.newExpiration ? (
                <React.Fragment>
                    {", "}
                    <TranslateWithLinks
                        string="operation.limit_order_update_expiration"
                        keys={[]}
                        params={{expiration: view.newExpiration}}
                    />
                </React.Fragment>
            ) : null}
            {view.onFill ? (
                view.onFill.length ? (
                    view.onFill.map((action, index) => (
                        <React.Fragment key={"on-fill-" + index}>
                            {", "}
                            <OnFillDetail action={action} />
                        </React.Fragment>
                    ))
                ) : (
                    <React.Fragment>
                        {", "}
                        <Translate content="operation.limit_order_update_on_fill_clear" />
                    </React.Fragment>
                )
            ) : null}
        </span>
    );
};
