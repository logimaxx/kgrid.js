(function (CT) {
    CT.setDefaultValues = function (proto, col) {
        const newCol = {...proto};
        Object.keys(col).forEach(key => {
            if(col[key] && col[key].constructor === Object) {
                newCol[key] = CT.setDefaultValues(newCol[key], col[key]);
                return;
            }
            newCol[key] = col[key];
        });
        return newCol;
    };
})(window.KGrid);
