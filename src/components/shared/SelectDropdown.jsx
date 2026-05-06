'use client'
import React, { useEffect, useRef, useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import getIcon from '@/utils/getIcon';

const SelectDropdown = ({ options, selectedOption, onSelectOption, className, defaultSelect, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [openUpwards, setOpenUpwards] = useState(false);
    const [localSelectedOption, setLocalSelectedOption] = useState(null);

    const dropdownRef = useRef(null);

    // ──────────────────────────────────────────────────────
    // Sync local selection with whatever the parent provides.
    //
    // Priority order:
    //   1. `selectedOption` prop (a full option object) — the modern,
    //      controlled way. This is what EditTask / AddTask now pass.
    //   2. `defaultSelect` — kept for backward compatibility with older
    //      callers. Matches against EITHER value OR label (case-insensitive,
    //      coerced to string) so it works whether the caller passes an id
    //      or a label.
    //
    // CRITICAL: the previous version compared `defaultSelect` only to
    // `option.value` and called `.toLowerCase()` unconditionally, which
    //  (a) crashed on non-string values (numbers / ObjectIds in some shapes)
    //  (b) wiped the selection to null whenever the parent re-rendered
    //      with a label-shaped defaultSelect — causing the "click twice"
    //      bug and the missing-API-default bug.
    // ──────────────────────────────────────────────────────
    useEffect(() => {
        // Case 1: parent is using the controlled `selectedOption` prop
        if (selectedOption !== undefined) {
            setLocalSelectedOption(selectedOption || null);
            return;
        }

        // Case 2: legacy `defaultSelect` string — match against value OR label
        if (defaultSelect && options?.length) {
            const needle = String(defaultSelect).toLowerCase();
            const found = options.find((option) => {
                const v = option.value !== undefined && option.value !== null ? String(option.value).toLowerCase() : '';
                const l = option.label !== undefined && option.label !== null ? String(option.label).toLowerCase() : '';
                return v === needle || l === needle;
            });
            setLocalSelectedOption(found || null);
            return;
        }

        // Nothing to sync from
        if (!defaultSelect && selectedOption === undefined) {
            setLocalSelectedOption(null);
        }
    }, [selectedOption, defaultSelect, options]);

    // Click-outside handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const toggleDropdown = () => {
        if (disabled) return;
        setIsOpen((prev) => !prev);
    };

    const filteredOptions = options?.filter((option) =>
        option.label?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    useEffect(() => {
        if (isOpen) {
            const dropdown = dropdownRef.current;
            if (!dropdown) return;
            const dropdownRect = dropdown.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            setOpenUpwards(dropdownRect.bottom + 200 > windowHeight);
        }
    }, [isOpen]);

    const handleOptionClick = (option) => {
        // Update local view immediately so the click feels instant
        setLocalSelectedOption(option);
        // Notify parent — parent's state update will flow back through the
        // sync effect above, but since we set localSelectedOption to the
        // same object here, that's a no-op (no flicker, no loss of click).
        onSelectOption(option);
        setIsOpen(false);
        setSearchTerm('');
    };

    // Display label fallback chain:
    //  1. Currently selected option's label
    //  2. `defaultSelect` if it's a plain string placeholder
    //     (e.g., "Select organization") and no option is selected
    //  3. Empty
    const displayLabel = localSelectedOption?.label
        ?? (typeof defaultSelect === 'string' && !options?.some(o => String(o.value) === defaultSelect)
            ? defaultSelect
            : '');

    return (
        <div
            className={`select-dropdown ${className || ''} ${openUpwards ? 'open-upwards' : ''} ${disabled ? 'disabled' : ''}`}
            ref={dropdownRef}
        >
            <div
                className="select-box"
                onClick={toggleDropdown}
                style={disabled ? { cursor: 'not-allowed', opacity: 0.6 } : undefined}
            >
                <span className="selected-label">
                    {localSelectedOption?.color && (
                        <span className="status-dot" style={{ backgroundColor: localSelectedOption.color }}></span>
                    )}
                    {localSelectedOption?.icon && (
                        <span className={`lh-1 fs-16 ${localSelectedOption.iconClassName || ''}`}>
                            {getIcon(localSelectedOption.icon)}
                        </span>
                    )}
                    {localSelectedOption?.img && (
                        <img src={localSelectedOption.img} className="avatar-image avatar-sm" alt="" />
                    )}
                    {displayLabel}
                </span>
                <span className="arrow">{isOpen ? <FiChevronUp /> : <FiChevronDown />}</span>
            </div>

            {isOpen && (
                <div className="dropdown-list">
                    <div className="search-input-outer">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <ul>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <li
                                    key={option.value}
                                    onClick={() => handleOptionClick(option)}
                                    className={option.value === localSelectedOption?.value ? 'active' : ''}
                                >
                                    {option.color && (
                                        <span className="status-dot" style={{ backgroundColor: option.color }}></span>
                                    )}
                                    {option.icon && (
                                        <span className={`lh-1 me-3 fs-16 ${option.iconClassName || ''}`}>
                                            {getIcon(option.icon)}
                                        </span>
                                    )}
                                    {option.img && (
                                        <img src={option.img} className="avatar-image avatar-sm me-2" alt="" />
                                    )}
                                    {option.label}
                                </li>
                            ))
                        ) : (
                            <li className="no-result">No results found</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SelectDropdown;