import React from "react";
import TranslateWithLinks from "../../Utility/TranslateWithLinks";

export function LiquidityPoolFees({fees}) {
    if (!fees || !fees.length) {
        return null;
    }
    return (
        <React.Fragment>
            {fees.map((fee, index) => (
                <React.Fragment key={"pool-fee-" + index}>
                    {", "}
                    <TranslateWithLinks
                        string="operation.liquidity_pool_fee"
                        keys={[
                            {
                                type: "amount",
                                value: fee,
                                arg: "amount"
                            }
                        ]}
                    />
                </React.Fragment>
            ))}
        </React.Fragment>
    );
}
