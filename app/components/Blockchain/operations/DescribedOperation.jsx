import React from "react";
import TranslateWithLinks from "../../Utility/TranslateWithLinks";
import {historyOperationSummary} from "common/operationDetails";

export const DescribedOperation = ({op, view, changeColor}) => {
    const resolved = view || historyOperationSummary(op);
    if (!resolved || !resolved.summary) {
        return null;
    }
    if (changeColor) {
        changeColor(resolved.color || "info");
    }

    const parts = [resolved.summary].concat(resolved.summary.clauses || []);
    return (
        <span>
            {parts.map((part, index) => (
                <React.Fragment key={part.stringKey + "-" + index}>
                    {index > 0 ? ", " : null}
                    <TranslateWithLinks
                        string={part.stringKey}
                        keys={part.keys || []}
                        params={part.params}
                    />
                </React.Fragment>
            ))}
        </span>
    );
};
