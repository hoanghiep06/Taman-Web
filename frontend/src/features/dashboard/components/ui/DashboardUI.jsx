/**
 * DashboardUI — Shared primitives dùng chung cho tất cả role dashboards.
 *
 * Export:
 *  StatCard, Section, EmptyState, StatusBadge, AlertItem,
 *  Modal, DetailFieldsModal, DetailListModal, TwoColumns
 */

import { useState } from "react";

import styles from "./DashboardUI.module.css";

/* =========================================================
   STAT CARD
========================================================= */

export const StatCard = ({ title, value, icon, color, onClick }) => (
    <button
        type="button"
        className={styles.statCard}
        style={{ "--stat-color": color }}
        onClick={onClick}
        data-disabled={!onClick}
    >
        <div className={styles.statIcon}>{icon}</div>

        <div className={styles.statContent}>
            <span>{title}</span>
            <strong>{value}</strong>
        </div>
    </button>
);

/* =========================================================
   SECTION
========================================================= */

export const Section = ({ title, right, children, className = "", onTitleClick }) => (
    <section className={`${styles.section} ${className}`}>
        <div className={styles.sectionHeader}>
            {onTitleClick ? (
                <button
                    type="button"
                    className={styles.sectionTitleButton}
                    onClick={onTitleClick}
                >
                    {title}
                </button>
            ) : (
                <h2>{title}</h2>
            )}
            {right}
        </div>

        {children}
    </section>
);

/* =========================================================
   EMPTY STATE
========================================================= */

export const EmptyState = ({ message = "Không có dữ liệu" }) => (
    <div className={styles.emptyState}>{message}</div>
);

/* =========================================================
   STATUS BADGE
========================================================= */

export const StatusBadge = ({ status }) => {
    const normalized = String(status).toLowerCase();

    let className = styles.statusInfo;

    if (
        normalized.includes("đầy") ||
        normalized.includes("quá hạn") ||
        normalized.includes("danger") ||
        normalized.includes("không") ||
        normalized.includes("báo động") ||
        normalized.includes("overdue") ||
        normalized.includes("missed")
    ) {
        className = styles.statusDanger;
    } else if (
        normalized.includes("trống") ||
        normalized.includes("hoàn thành") ||
        normalized.includes("active") ||
        normalized.includes("ổn định")
    ) {
        className = styles.statusSuccess;
    } else if (
        normalized.includes("đang") ||
        normalized.includes("warning") ||
        normalized.includes("chú ý") ||
        normalized.includes("theo dõi") ||
        normalized.includes("chưa")
    ) {
        className = styles.statusWarning;
    }

    return (
        <span className={`${styles.statusBadge} ${className}`}>
            {status}
        </span>
    );
};

/* =========================================================
   ALERT ITEM
========================================================= */

export const AlertItem = ({ item, onClick }) => {
    const content = (
        <>
            <div className={`${styles.alertDot} ${styles[item.type]}`} />

            <div className={styles.alertContent}>
                <strong>{item.title}</strong>
                <p>{item.message || item.description || item.condition}</p>
                {item.time && <small>{item.time}</small>}
            </div>
        </>
    );

    if (!onClick) {
        return <div className={styles.alertItem}>{content}</div>;
    }

    return (
        <button
            type="button"
            className={`${styles.rowButton} ${styles.alertItem}`}
            onClick={onClick}
        >
            {content}
        </button>
    );
};

/* =========================================================
   MODAL
========================================================= */

export const Modal = ({ title, children, onClose, wide = false }) => (
    <div className={styles.modalOverlay} onClick={onClose}>
        <div
            className={`${styles.modal} ${wide ? styles.modalWide : ""}`}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={styles.modalHeader}>
                <h2>{title}</h2>

                <button
                    type="button"
                    className={styles.closeButton}
                    onClick={onClose}
                >
                    ×
                </button>
            </div>

            <div className={styles.modalBody}>{children}</div>
        </div>
    </div>
);

/* =========================================================
   DETAIL FIELDS MODAL (profile, single item detail)
========================================================= */

export const DetailFieldsModal = ({ title, fields, avatarLabel, onClose }) => (
    <Modal title={title} onClose={onClose}>
        <div className={styles.profile}>
            {avatarLabel && (
                <div className={styles.profileAvatar}>{avatarLabel}</div>
            )}

            {fields.map((field) => (
                <p key={field.label}>
                    <b>{field.label}:</b> {field.value}
                </p>
            ))}
        </div>
    </Modal>
);

/* =========================================================
   DETAIL LIST MODAL (danh sách xem tất cả)
   enableSearch: bật ô tìm theo tên (dùng renderPrimary để lấy text)
   enableFacilityFilter: bật dropdown lọc theo field facilityKey
   facilityKey: tên field chứa cơ sở trong mỗi item (mặc định "facility")
========================================================= */

export const DetailListModal = ({
    title,
    items,
    onClose,
    onItemClick,
    renderPrimary,
    renderSecondary,
    renderBadge,
    wide = false,
    enableSearch = false,
    searchKeys = [],
    enableFilter = false,
    filterKey = "",
    filterLabel = "",
    filterOptions = null,
}) => {
    const [search, setSearch] = useState("");
    const [filterValue, setFilterValue] = useState("all");

    const derivedFilterOptions =
        enableFilter && filterKey
            ? filterOptions ??
              Array.from(new Set(items.map((item) => item[filterKey]).filter(Boolean)))
            : [];

    const filteredItems = items.filter((item) => {
        const searchTarget = [renderPrimary(item), ...searchKeys.map((key) => item[key])]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const matchesSearch = !search || searchTarget.includes(search.toLowerCase());

        const matchesFilter =
            !enableFilter || filterValue === "all" || item[filterKey] === filterValue;

        return matchesSearch && matchesFilter;
    });

    return (
        <Modal title={title} onClose={onClose} wide={wide}>
            {(enableSearch || enableFilter) && (
                <div className={styles.filterBar}>
                    {enableSearch && (
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Tìm kiếm..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    )}

                    {enableFilter && (
                        <select
                            className={styles.filterSelect}
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                        >
                            <option value="all">Tất cả {filterLabel}</option>
                            {derivedFilterOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            )}

            <div className={styles.personList}>
                {filteredItems.map((item, index) => {
                    const rowContent = (
                        <>
                            <div>
                                <strong>{renderPrimary(item)}</strong>
                                {renderSecondary && <span>{renderSecondary(item)}</span>}
                            </div>

                            {renderBadge && renderBadge(item)}
                            {onItemClick && <span className={styles.chevron}>→</span>}
                        </>
                    );

                    if (!onItemClick) {
                        return (
                            <div className={styles.personRow} key={item.id ?? index}>
                                {rowContent}
                            </div>
                        );
                    }

                    return (
                        <button
                            type="button"
                            className={`${styles.rowButton} ${styles.personRow}`}
                            key={item.id ?? index}
                            onClick={() => onItemClick(item)}
                        >
                            {rowContent}
                        </button>
                    );
                })}

                {!filteredItems.length && (
                    <EmptyState message="Không tìm thấy kết quả phù hợp" />
                )}
            </div>
        </Modal>
    );
};

/* =========================================================
   TWO COLUMNS LAYOUT
========================================================= */

export const TwoColumns = ({ children }) => (
    <div className={styles.twoColumns}>{children}</div>
);

/* =========================================================
   LINK BUTTON
========================================================= */

export const LinkButton = ({ children, onClick }) => (
    <button type="button" className={styles.linkButton} onClick={onClick}>
        {children}
    </button>
);

/* =========================================================
   COUNT BADGE
========================================================= */

export const CountBadge = ({ count }) => (
    <span className={styles.countBadge}>{count}</span>
);