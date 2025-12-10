import React from 'react';

const Panel = ({ position, children, className = '' }) => {
    return (
        <div className={`panel panel-${position} ${className}`}>
            {children}
        </div>
    );
};

export default Panel;







