# Dangerous Goods Compatibility Logic Centralization Summary

This document summarizes the changes made to centralize all Dangerous Goods (DG) compatibility and segregation logic into the `dangerous_goods/services.py` module.

## Problem Statement

The `load_plans/services.py` contained a duplicate and less robust implementation of DG compatibility checking logic that was already available in `dangerous_goods/services.py`. This created:
- Code duplication
- Inconsistent behavior
- Maintenance overhead
- Risk of divergent implementations

## Solution Implemented

### 1. Enhanced `dangerous_goods/services.py`

#### New Functions Added:

**`check_dg_compatibility_multiple(dg_items: List[DangerousGood])`**
- Handles compatibility checking for multiple DG items
- Performs pairwise compatibility checks
- Applies group-level safety rules
- Returns comprehensive compatibility results

**`_apply_safety_rules(dg1: DangerousGood, dg2: DangerousGood, reasons: List[str])`**
- Applies all safety rules from `safety_rules.py`
- Checks fire risk vs oxidizer conflicts
- Checks food sensitivity conflicts
- Checks water sensitivity conflicts
- Checks toxicity conflicts
- Checks bulk incompatibility

**`_apply_group_safety_rules(dg_items: List[DangerousGood], reasons: List[str])`**
- Applies group-level safety rules
- Detects fire risk vs oxidizer conflicts across groups
- Detects food sensitivity conflicts across groups

#### Enhanced Existing Function:

**`check_dg_compatibility(dg1: DangerousGood, dg2: DangerousGood)`**
- Now incorporates all safety rules from `safety_rules.py`
- Maintains backward compatibility
- Provides more comprehensive compatibility checking

### 2. Updated `load_plans/services.py`

#### Changes Made:
- **Import Update**: Changed from `check_dg_compatibility` to `check_dg_compatibility_multiple`
- **Function Call Update**: Updated the compatibility check call to use the new centralized function
- **Result Handling**: Updated to use the correct result key (`'compatible'` instead of `'is_compatible'`)

#### Before:
```python
from dangerous_goods.services import check_dg_compatibility

# Later in the code:
compatibility_result = check_dg_compatibility(dg_objects)
if not compatibility_result['is_compatible']:
    # Handle incompatibility
```

#### After:
```python
from dangerous_goods.services import check_dg_compatibility_multiple

# Later in the code:
compatibility_result = check_dg_compatibility_multiple(dg_objects)
if not compatibility_result['compatible']:
    # Handle incompatibility
```

### 3. Comprehensive Testing

#### New Test File: `dangerous_goods/test_centralized_compatibility.py`

**Test Coverage:**
- Basic compatibility checking between two DG items
- Multiple items compatibility checking
- Food sensitivity conflict detection
- Single item and empty list handling
- Load plan integration testing
- Segregation rules integration
- Safety rules integration

**Key Test Scenarios:**
- Fire risk vs oxidizer conflicts
- Toxic substances vs foodstuffs
- Compatible items (same hazard class)
- Edge cases (single items, empty lists)
- Integration with load plan creation

## Business Rules Incorporated

The centralized logic now incorporates all business rules from `dangerous_goods/safety_rules.py`:

### 1. Fire Risk vs Oxidizer Conflicts
- Class 3 (Flammable Liquids) vs Class 5.1 (Oxidizing Substances)
- Class 4.1 (Flammable Solids) vs Class 5.1
- Class 4.2 (Spontaneously Combustible) vs Class 5.1
- Class 4.3 (Dangerous When Wet) vs Class 5.1

### 2. Food Sensitivity Conflicts
- Class 6.1 (Toxic Substances) vs Foodstuffs
- Class 6.2 (Infectious Substances) vs Foodstuffs
- Class 8 (Corrosive Substances) vs Foodstuffs

### 3. Water Sensitivity Conflicts
- Class 4.3 (Dangerous When Wet) vs Class 8 (Corrosive Substances)

### 4. Bulk Transport Incompatibilities
- Items with different bulk transport requirements
- Special handling requirements for bulk items

## Benefits Achieved

### 1. **Single Source of Truth**
- All DG compatibility logic is now centralized in `dangerous_goods/services.py`
- No duplicate implementations across the codebase
- Consistent behavior across all applications

### 2. **Enhanced Functionality**
- More comprehensive compatibility checking
- Incorporation of all safety rules from `safety_rules.py`
- Support for both pairwise and group-level compatibility checking

### 3. **Improved Maintainability**
- Changes to compatibility logic only need to be made in one place
- Easier to add new safety rules and compatibility checks
- Reduced risk of divergent implementations

### 4. **Better Testability**
- Comprehensive test suite for all compatibility scenarios
- Isolated testing of compatibility logic
- Integration testing with load plan creation

### 5. **Backward Compatibility**
- Existing function signatures maintained
- Existing code continues to work without changes
- Gradual migration path for other applications

## Acceptance Criteria Met

### ✅ Single `check_dg_compatibility` Function
- Only one comprehensive implementation exists in `dangerous_goods/services.py`
- All other applications use this centralized function

### ✅ Load Plans Integration
- `load_plans/services.py` correctly calls the centralized service
- Proper handling of multiple DG items
- Correct result processing and error handling

### ✅ Business Rules Integration
- All rules from `dangerous_goods/safety_rules.py` are incorporated
- Fire risk vs oxidizer conflicts detected
- Food sensitivity conflicts detected
- Water sensitivity conflicts detected
- Bulk incompatibilities detected

### ✅ Comprehensive Testing
- Unit tests for all compatibility scenarios
- Integration tests with load plan creation
- Edge case handling (single items, empty lists)
- Safety rules integration verification

## Technical Implementation Details

### Function Signatures

```python
# Original function (enhanced)
def check_dg_compatibility(dg1: DangerousGood, dg2: DangerousGood) -> Dict[str, Union[bool, List[str]]]:
    """Checks compatibility between two dangerous goods items."""

# New function for multiple items
def check_dg_compatibility_multiple(dg_items: List[DangerousGood]) -> Dict[str, Union[bool, List[str]]]:
    """Checks compatibility between multiple dangerous goods items."""
```

### Return Format

```python
{
    'compatible': bool,  # True if all items are compatible
    'reasons': List[str]  # List of incompatibility reasons
}
```

### Safety Rules Integration

The centralized logic automatically applies all safety rules:
- Fire risk vs oxidizer conflicts
- Food sensitivity conflicts  
- Water sensitivity conflicts
- Toxicity conflicts
- Bulk transport incompatibilities

## Future Enhancements

1. **Performance Optimization**: Consider caching frequently checked compatibility results
2. **Additional Safety Rules**: Easy to add new safety rules to `safety_rules.py`
3. **Real-time Validation**: Integration with real-time DG validation systems
4. **Regulatory Updates**: Centralized handling of regulatory changes
5. **Audit Trail**: Logging of compatibility decisions for audit purposes

## Migration Guide for Other Applications

To use the centralized DG compatibility logic in other applications:

1. **Import the function**:
   ```python
   from dangerous_goods.services import check_dg_compatibility_multiple
   ```

2. **Call the function**:
   ```python
   result = check_dg_compatibility_multiple(dg_items_list)
   ```

3. **Handle the result**:
   ```python
   if not result['compatible']:
       # Handle incompatibilities
       for reason in result['reasons']:
           # Process each incompatibility reason
   ```

This centralization ensures consistent, reliable, and maintainable DG compatibility checking across the entire SafeShipper application. 