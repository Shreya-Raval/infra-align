"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  districtStateOptionsFromPostOffices,
  fetchPostOfficesByPincode,
  pincodeMatchesCityState,
  searchPostOfficesByName,
  validateLocationFields,
  validatePincodeAgainstCityState,
} from "@/lib/indiaPost";

/**
 * @typedef {Object} LocationValue
 * @property {string} pincode
 * @property {string} city
 * @property {string} state
 */

/**
 * @typedef {Object} LocationFieldsHandle
 * @property {() => Promise<string|null>} validateAsync
 */

const LocationFields = forwardRef(function LocationFields(
  {
    idPrefix = "location",
    pincode,
    city,
    state,
    onPincodeChange,
    onCityChange,
    onStateChange,
    disabled = false,
    pincodeLabel = "Pincode",
    pincodeHint = "6 digits",
  },
  ref
) {
  const [pincodeError, setPincodeError] = useState("");
  const [cityError, setCityError] = useState("");
  const [isLookingUpPincode, setIsLookingUpPincode] = useState(false);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [cityQuery, setCityQuery] = useState(city || "");
  const [cityOptions, setCityOptions] = useState([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [pincodePostOffices, setPincodePostOffices] = useState([]);

  const cityWrapRef = useRef(null);
  const searchTimerRef = useRef(null);

  useEffect(() => {
    setCityQuery(city || "");
  }, [city]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (cityWrapRef.current && !cityWrapRef.current.contains(e.target)) {
        setShowCityDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const applyCitySelection = useCallback(
    async (option, postOfficesForPincode = pincodePostOffices) => {
      onCityChange(option.city);
      onStateChange(option.state);
      setCityQuery(option.city);
      setCityError("");
      setShowCityDropdown(false);

      const code = pincode.trim();
      if (code.length === 6) {
        let offices = postOfficesForPincode;
        if (!offices.length) {
          setIsLookingUpPincode(true);
          try {
            offices = await fetchPostOfficesByPincode(code);
            setPincodePostOffices(offices);
          } catch {
            setPincodeError("Could not verify pincode against the selected city.");
            setIsLookingUpPincode(false);
            return;
          }
          setIsLookingUpPincode(false);
        }

        if (!offices.length) {
          setPincodeError("Pincode not found.");
        } else if (!pincodeMatchesCityState(offices, option.city, option.state)) {
          setPincodeError(
            `Pincode ${code} does not match ${option.city}, ${option.state}.`
          );
        } else {
          setPincodeError("");
        }
      }
    },
    [onCityChange, onStateChange, pincode, pincodePostOffices]
  );

  const lookupPincode = useCallback(
    async (code, currentCity = city, currentState = state) => {
      setIsLookingUpPincode(true);
      setPincodeError("");

      try {
        const postOffices = await fetchPostOfficesByPincode(code);
        setPincodePostOffices(postOffices);

        if (!postOffices.length) {
          setPincodeError("Pincode not found. Check the number and try again.");
          return;
        }

        const options = districtStateOptionsFromPostOffices(postOffices);

        if (currentCity.trim() && currentState.trim()) {
          if (!pincodeMatchesCityState(postOffices, currentCity, currentState)) {
            setPincodeError(
              `Pincode ${code} does not match ${currentCity.trim()}, ${currentState.trim()}.`
            );
          }
          return;
        }

        if (options.length === 1) {
          await applyCitySelection(options[0], postOffices);
        } else if (options.length > 1) {
          setCityOptions(options);
          setShowCityDropdown(true);
          setPincodeError("Multiple areas share this pincode — select your city below.");
        }
      } catch {
        setPincodeError("Could not look up pincode. Check your connection and try again.");
      } finally {
        setIsLookingUpPincode(false);
      }
    },
    [applyCitySelection, city, state]
  );

  const handlePincodeInput = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    onPincodeChange(value);
    setPincodeError("");

    if (value.length < 6) {
      setPincodePostOffices([]);
    }

    if (value.length === 6) {
      lookupPincode(value);
    }
  };

  const handleCityQueryChange = (e) => {
    const value = e.target.value;
    setCityQuery(value);
    setCityError("");
    onCityChange("");
    onStateChange("");
    setPincodeError("");

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (value.trim().length < 2) {
      setCityOptions([]);
      setShowCityDropdown(false);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      setIsSearchingCity(true);
      try {
        const results = searchPostOfficesByName(value.trim());
        const postOffices = await results;
        const options = districtStateOptionsFromPostOffices(postOffices);
        setCityOptions(options);
        setShowCityDropdown(options.length > 0);
        if (!options.length) {
          setCityError("No matching cities found. Try a different spelling.");
        }
      } catch {
        setCityError("City search failed. Try again in a moment.");
      } finally {
        setIsSearchingCity(false);
      }
    }, 350);
  };

  useImperativeHandle(ref, () => ({
    validateAsync: async () => {
      const syncError = validateLocationFields({ pincode, city, state });
      if (syncError) {
        if (syncError.includes("pincode")) {
          setPincodeError(syncError);
          setCityError("");
        } else {
          setCityError(syncError);
          setPincodeError("");
        }
        return syncError;
      }

      const mismatchError = await validatePincodeAgainstCityState(pincode, city, state);
      if (mismatchError) {
        setPincodeError(mismatchError);
        setCityError("");
        return mismatchError;
      }

      setPincodeError("");
      setCityError("");
      return null;
    },
  }));

  const inputClass =
    "w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/50 dark:bg-slate-900/40 text-foreground placeholder:text-muted-foreground text-sm focus:bg-card focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all";

  const stateClass =
    "w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted text-muted-foreground text-sm cursor-not-allowed opacity-80";

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor={`${idPrefix}-pincode`} className="block text-xs font-semibold text-foreground/80">
            {pincodeLabel} <span className="text-rose-500">*</span>
          </label>
          <span className="text-[11px] text-muted-foreground">{pincodeHint}</span>
        </div>
        <div className="relative">
          <input
            id={`${idPrefix}-pincode`}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={pincode}
            onChange={handlePincodeInput}
            placeholder="400053"
            disabled={disabled || isLookingUpPincode}
            required
            className={`${inputClass} font-medium tracking-wide pr-10`}
          />
          {isLookingUpPincode && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        {pincodeError && (
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1.5 font-medium">
            {pincodeError}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div ref={cityWrapRef} className="relative">
          <label htmlFor={`${idPrefix}-city`} className="block text-xs font-semibold text-foreground/80 mb-1.5">
            City / District <span className="text-rose-500">*</span>
          </label>
          <input
            id={`${idPrefix}-city`}
            type="text"
            value={cityQuery}
            onChange={handleCityQueryChange}
            onFocus={() => {
              if (cityOptions.length > 0) setShowCityDropdown(true);
            }}
            placeholder="Search city…"
            disabled={disabled}
            required
            autoComplete="off"
            className={`${inputClass} pr-10`}
          />
          {isSearchingCity && (
            <div className="absolute right-3 top-[2.35rem]">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {showCityDropdown && cityOptions.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-xl border border-border bg-card shadow-lg py-1">
              {cityOptions.map((option) => (
                <li key={option.key}>
                  <button
                    type="button"
                    className="w-full text-left px-3.5 py-2.5 hover:bg-muted transition-colors"
                    onClick={() => applyCitySelection(option)}
                  >
                    <div className="text-sm font-medium text-foreground">{option.city}</div>
                    <div className="text-[11px] text-muted-foreground">{option.state}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {cityError && (
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1.5 font-medium">
              {cityError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`${idPrefix}-state`} className="block text-xs font-semibold text-foreground/80 mb-1.5">
            State <span className="text-rose-500">*</span>
          </label>
          <input
            id={`${idPrefix}-state`}
            type="text"
            value={state}
            readOnly
            disabled
            required
            placeholder="Auto-filled"
            className={stateClass}
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Filled automatically when you select a city or enter a valid pincode.
          </p>
        </div>
      </div>
    </div>
  );
});

export default LocationFields;
