# dangerous_goods/models.py
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _
from simple_history.models import HistoricalRecords
from users.models import User

class PackingGroup(models.TextChoices):
    I = 'I', _('I (High Danger)')
    II = 'II', _('II (Medium Danger)')
    III = 'III', _('III (Low Danger)')
    NONE = 'NONE', _('None / Not Applicable') # Added for DGs without PG

class PhysicalForm(models.TextChoices):
    SOLID = 'SOLID', _('Solid')
    LIQUID = 'LIQUID', _('Liquid')
    GAS = 'GAS', _('Gas')
    UNKNOWN = 'UNKNOWN', _('Unknown')

class DangerousGood(models.Model):
    """
    Represents a specific dangerous good entry, based on regulations (IATA, IMDG, ADR etc.).
    """
    un_number = models.CharField(
        _("UN Number"), max_length=10, unique=True, db_index=True,
        help_text=_("Unique UN number (e.g., UN1230).")
    )
    proper_shipping_name = models.CharField(
        _("Proper Shipping Name (PSN)"), max_length=1024, db_index=True, # Increased length
        help_text=_("Official name for transport.")
    )
    simplified_name = models.CharField(
        _("Simplified/Common Name"), max_length=1024, blank=True, null=True, # Increased length
        help_text=_("A more concise or common name.")
    )
    hazard_class = models.CharField(
        _("Hazard Class/Division"), max_length=20, db_index=True, # Increased length for complex classes e.g. "1.1A"
        help_text=_("Primary hazard class or division.")
    )
    subsidiary_risks = models.CharField(
        _("Subsidiary Risks"), max_length=100, blank=True, null=True,
        help_text=_("Comma-separated subsidiary hazard classes/divisions.")
    )
    packing_group = models.CharField(
        _("Packing Group"), max_length=5, choices=PackingGroup.choices,
        blank=True, null=True, help_text=_("Packing group indicating danger degree.")
    )
    hazard_labels_required = models.CharField(
        _("Hazard Label(s) Required"), max_length=255, blank=True, null=True,
        help_text=_("Comma-separated required hazard labels.")
    )
    erg_guide_number = models.CharField(
        _("ERG Guide Number"), max_length=10, blank=True, null=True,
        help_text=_("Emergency Response Guidebook number.")
    )
    special_provisions = models.TextField(
        _("Special Provisions"), blank=True, null=True,
        help_text=_("Applicable special provisions codes (comma-separated or text).")
    )
    qty_ltd_passenger_aircraft = models.CharField(
        _("Qty Ltd - Pax Aircraft"), max_length=50, blank=True, null=True,
        help_text=_("Quantity limitation for passenger aircraft.")
    )
    packing_instruction_passenger_aircraft = models.CharField(
        _("PI - Pax Aircraft"), max_length=50, blank=True, null=True
    )
    qty_ltd_cargo_aircraft = models.CharField(
        _("Qty Ltd - Cargo Aircraft"), max_length=50, blank=True, null=True,
        help_text=_("Quantity limitation for cargo aircraft only.")
    )
    packing_instruction_cargo_aircraft = models.CharField(
        _("PI - Cargo Aircraft"), max_length=50, blank=True, null=True
    )
    description_notes = models.TextField(
        _("Description/Notes"), blank=True, null=True,
        help_text=_("Additional descriptive notes or regulatory remarks.")
    )
    is_marine_pollutant = models.BooleanField(_("Marine Pollutant"), default=False)
    is_environmentally_hazardous = models.BooleanField(_("Environmentally Hazardous"), default=False)
    
    is_fire_risk = models.BooleanField( # Terry's suggestion
        _("Is a Fire Risk?"), default=False,
        help_text=_("Indicates if this substance inherently poses a significant fire risk.")
    )
    is_bulk_transport_allowed = models.BooleanField( # Terry's suggestion
        _("Bulk Transport Allowed?"), default=True, # Assume allowed unless specified
        help_text=_("Can this substance generally be transported in bulk quantities?")
    )
    physical_form = models.CharField( # Terry's suggestion
        _("Physical Form"), max_length=10, choices=PhysicalForm.choices,
        default=PhysicalForm.UNKNOWN, help_text=_("Typical physical form (Solid, Liquid, Gas).")
    )
    
    # Audit trail fields (Terry's suggestion)
    # created_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='created_dgs', null=True, blank=True, on_delete=models.SET_NULL)
    # updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='updated_dgs', null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # last_checked_at = models.DateTimeField(_("Last Regulatory Check"), null=True, blank=True) # For tracking when data was last verified against regs

    # Add history tracking
    history = HistoricalRecords()

    class Meta:
        verbose_name = _("Dangerous Good")
        verbose_name_plural = _("Dangerous Goods")
        ordering = ['un_number']
        indexes = [
            models.Index(fields=['un_number']),
            models.Index(fields=['proper_shipping_name']),
            models.Index(fields=['hazard_class']),
            models.Index(fields=['is_fire_risk']),
        ]

    def __str__(self):
        return f"{self.un_number} - {self.proper_shipping_name}"

    def save(self, *args, **kwargs):
        # Add any pre-save logic here
        super().save(*args, **kwargs)

class DGProductSynonym(models.Model): # As defined before
    dangerous_good = models.ForeignKey(DangerousGood, related_name='synonyms', on_delete=models.CASCADE)
    synonym = models.CharField(_("Keyword/Product Name/Synonym"), max_length=255, db_index=True)
    class Source(models.TextChoices):
        MANUAL = 'MANUAL', _('Manually Entered')
        IATA_IMPORT = 'IATA_IMPORT', _('IATA Data Import')
        LEARNED_SYSTEM = 'LEARNED_SYSTEM', _('Learned by System')
        USER_CONFIRMED = 'USER_CONFIRMED', _('User Confirmed')
    source = models.CharField(_("Source of Synonym"), max_length=20, choices=Source.choices, default=Source.MANUAL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        verbose_name = _("DG Product Synonym/Keyword")
        verbose_name_plural = _("DG Product Synonyms/Keywords")
        unique_together = [['dangerous_good', 'synonym']]
        ordering = ['dangerous_good', 'synonym']
        indexes = [ models.Index(fields=['synonym']), ]
    def __str__(self):
        return f"{self.synonym} (for {self.dangerous_good.un_number})"

class SegregationGroup(models.Model): # As defined before
    code = models.CharField(_("Group Code"), max_length=20, unique=True)
    name = models.CharField(_("Group Name"), max_length=255)
    description = models.TextField(_("Description"), blank=True, null=True)
    dangerous_goods = models.ManyToManyField(DangerousGood, related_name='segregation_groups', blank=True)
    def __str__(self):
        return f"{self.name} ({self.code})"
    class Meta:
        verbose_name = _("DG Segregation Group")
        verbose_name_plural = _("DG Segregation Groups")
        ordering = ['name']

class SegregationRule(models.Model):
    class RuleType(models.TextChoices):
        CLASS_TO_CLASS = 'CLASS_CLASS', _('Class vs Class')
        GROUP_TO_GROUP = 'GROUP_GROUP', _('Segregation Group vs Segregation Group')
        CLASS_TO_GROUP = 'CLASS_GROUP', _('Class vs Segregation Group')
        # UN_TO_UN = 'UN_UN', _('UN Number vs UN Number') # Can add later

    rule_type = models.CharField(max_length=20, choices=RuleType.choices, default=RuleType.CLASS_TO_CLASS)

    primary_hazard_class = models.CharField(_("Primary Hazard Class"), max_length=20, blank=True, null=True, db_index=True)
    secondary_hazard_class = models.CharField(_("Secondary Hazard Class"), max_length=20, blank=True, null=True, db_index=True)

    primary_segregation_group = models.ForeignKey(SegregationGroup, related_name='primary_rules', on_delete=models.CASCADE, null=True, blank=True)
    secondary_segregation_group = models.ForeignKey(SegregationGroup, related_name='secondary_rules', on_delete=models.CASCADE, null=True, blank=True)

    class Compatibility(models.TextChoices):
        COMPATIBLE = 'COMPATIBLE', _('Compatible')
        INCOMPATIBLE_PROHIBITED = 'INCOMPATIBLE_PROHIBITED', _('Incompatible - Prohibited')
        CONDITIONAL_NOTES = 'CONDITIONAL_NOTES', _('Conditional - See Notes')
        AWAY_FROM = 'AWAY_FROM', _('Away From')
        SEPARATED_FROM = 'SEPARATED_FROM', _('Separated From')
        # ... other standard segregation terms ...

    compatibility_status = models.CharField(_("Compatibility Status"), max_length=30, choices=Compatibility.choices)
    
    class ConditionType(models.TextChoices): # Terry's suggestion
        NONE = 'NONE', _('No Specific Condition')
        BOTH_BULK = 'BOTH_BULK', _('If Both are Bulk') # e.g. 2.1 and 3 if both bulk
        EITHER_BULK = 'EITHER_BULK', _('If Either is Bulk')
        PRIMARY_FIRE_RISK = 'PRIMARY_FIRE_RISK', _('If Primary Item is Fire Risk') # e.g. Class 6 (fire risk) vs 5.1
        SECONDARY_FIRE_RISK = 'SECONDARY_FIRE_RISK', _('If Secondary Item is Fire Risk')
        CLASS_9_LITHIUM_FIRE_RISK = 'CLASS_9_LITHIUM_FIRE_RISK', _('If Class 9 Lithium Battery (Fire Risk)') # Specific for Class 9 fire risk vs 5.1/5.2
        AWAY_FROM_FOODSTUFFS = 'AWAY_FROM_FOODSTUFFS', _('Away From Foodstuffs') # e.g. 2.3, 6, 7, 8 vs Foodstuffs group
        CLASS_1_LEGISLATION = 'CLASS_1_LEGISLATION', _('Refer to Explosives Legislation') # For Class 1 vs fire risks
        # Add more as needed
        
    condition_type = models.CharField( # Terry's suggestion
        _("Condition Type"), max_length=50, choices=ConditionType.choices, # Increased length for longer enum keys
        default=ConditionType.NONE, blank=True, null=True
    )
    condition_value = models.CharField( # Terry's suggestion (e.g., distance for separation)
        _("Condition Value/Parameter"), max_length=255, blank=True, null=True,
        help_text=_("Parameter for the condition, if applicable (e.g., '3m' for separation distance).")
    )
    notes = models.TextField(
        _("Notes/Regulatory Reference"), blank=True, null=True,
        help_text=_("Human-readable notes, specific conditions not covered by type/value, or regulatory references.")
    )
    source_regulation = models.CharField( # Terry's suggestion
        _("Source Regulation"), max_length=100, blank=True, null=True,
        help_text=_("e.g., IATA Table 9.3.A, IMDG Segregation Table, ADR Chapter X.Y, User Defined")
    )


    class Meta:
        verbose_name = _("DG Segregation/Compatibility Rule")
        verbose_name_plural = _("DG Segregation/Compatibility Rules")
        # Consider how to best enforce uniqueness to avoid conflicting or duplicate rules.
        # This might involve a custom clean() method on the model or careful data entry.
        # For example, for CLASS_TO_CLASS, you might want to ensure that if a rule for (A, B) exists,
        # a rule for (B, A) with the same conditions isn't also created unless it's explicitly different.
        # unique_together = (
        #     ('rule_type', 'primary_hazard_class', 'secondary_hazard_class', 'condition_type'),
        #     ('rule_type', 'primary_segregation_group', 'secondary_segregation_group', 'condition_type'),
        # ) # This is a starting point for unique_together

    def __str__(self):
        parts = []
        if self.rule_type == self.RuleType.CLASS_TO_CLASS:
            parts.append(f"Class {self.primary_hazard_class or '*'} vs Class {self.secondary_hazard_class or '*'}")
        elif self.rule_type == self.RuleType.GROUP_TO_GROUP:
            p_group = self.primary_segregation_group.code if self.primary_segregation_group else '*'
            s_group = self.secondary_segregation_group.code if self.secondary_segregation_group else '*'
            parts.append(f"Group {p_group} vs Group {s_group}")
        elif self.rule_type == self.RuleType.CLASS_TO_GROUP:
            p_class = self.primary_hazard_class or '*'
            s_group = self.secondary_segregation_group.code if self.secondary_segregation_group else '*' # Assuming secondary is group
            parts.append(f"Class {p_class} vs Group {s_group}")
        else:
            parts.append(f"Rule {self.id}")
        
        parts.append(f"-> {self.get_compatibility_status_display()}")
        if self.condition_type != self.ConditionType.NONE:
            parts.append(f"(Cond: {self.get_condition_type_display()})")
        return " ".join(parts)


class PHSegregationRule(models.Model):
    """
    pH-specific segregation rules for Class 8 (corrosive) dangerous goods.
    Provides detailed segregation requirements based on pH values, 
    with special attention to food and food packaging compatibility.
    """
    
    class PHRangeType(models.TextChoices):
        STRONGLY_ACIDIC = 'STRONGLY_ACIDIC', _('Strongly Acidic (pH < 2)')
        ACIDIC = 'ACIDIC', _('Acidic (pH 2-6.9)')
        NEUTRAL = 'NEUTRAL', _('Neutral (pH 7-7.5)')
        ALKALINE = 'ALKALINE', _('Alkaline (pH 7.6-12.5)')
        STRONGLY_ALKALINE = 'STRONGLY_ALKALINE', _('Strongly Alkaline (pH > 12.5)')
    
    class TargetType(models.TextChoices):
        FOOD = 'FOOD', _('Food and Foodstuffs')
        FOOD_PACKAGING = 'FOOD_PACKAGING', _('Food Packaging and Containers')
        FOOD_GRADE_MATERIALS = 'FOOD_GRADE_MATERIALS', _('Food Grade Materials')
        ALKALINE_MATERIALS = 'ALKALINE_MATERIALS', _('Alkaline Materials')
        ACIDIC_MATERIALS = 'ACIDIC_MATERIALS', _('Acidic Materials')
        OXIDIZING_AGENTS = 'OXIDIZING_AGENTS', _('Oxidizing Agents')
        GENERAL_CARGO = 'GENERAL_CARGO', _('General Cargo')
    
    class SeverityLevel(models.TextChoices):
        PROHIBITED = 'PROHIBITED', _('Prohibited - Never allow')
        CRITICAL = 'CRITICAL', _('Critical - Separate storage required')
        HIGH = 'HIGH', _('High - Minimum 10m separation')
        MEDIUM = 'MEDIUM', _('Medium - Minimum 5m separation')
        LOW = 'LOW', _('Low - Standard segregation')
        CAUTION = 'CAUTION', _('Caution - Monitor conditions')
    
    # pH range this rule applies to
    ph_range_type = models.CharField(
        _("pH Range Type"),
        max_length=30,
        choices=PHRangeType.choices,
        db_index=True
    )
    
    # Specific pH bounds (optional, for custom ranges)
    ph_min = models.FloatField(
        _("Minimum pH"),
        null=True,
        blank=True,
        help_text=_("Minimum pH value for this rule (overrides range type if specified)")
    )
    ph_max = models.FloatField(
        _("Maximum pH"),
        null=True,
        blank=True,
        help_text=_("Maximum pH value for this rule (overrides range type if specified)")
    )
    
    # What this rule applies to
    target_type = models.CharField(
        _("Target Material Type"),
        max_length=30,
        choices=TargetType.choices,
        db_index=True
    )
    
    # Severity of the segregation requirement
    severity_level = models.CharField(
        _("Severity Level"),
        max_length=20,
        choices=SeverityLevel.choices,
        db_index=True
    )
    
    # Minimum separation distance (in meters)
    min_separation_distance = models.PositiveIntegerField(
        _("Minimum Separation Distance (meters)"),
        null=True,
        blank=True,
        help_text=_("Minimum required separation distance in meters")
    )
    
    # Specific requirements and restrictions
    requirements = models.JSONField(
        _("Specific Requirements"),
        default=list,
        help_text=_("List of specific segregation requirements")
    )
    
    # Safety recommendations
    safety_recommendations = models.JSONField(
        _("Safety Recommendations"),
        default=list,
        help_text=_("List of safety recommendations for this pH range")
    )
    
    # Regulatory basis
    regulatory_basis = models.CharField(
        _("Regulatory Basis"),
        max_length=200,
        blank=True,
        help_text=_("Regulatory standard or guideline this rule is based on")
    )
    
    # Additional notes
    notes = models.TextField(
        _("Additional Notes"),
        blank=True,
        help_text=_("Additional information or special conditions")
    )
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_ph_rules'
    )
    
    class Meta:
        verbose_name = _("pH Segregation Rule")
        verbose_name_plural = _("pH Segregation Rules")
        indexes = [
            models.Index(fields=['ph_range_type', 'target_type']),
            models.Index(fields=['severity_level', 'target_type']),
            models.Index(fields=['ph_min', 'ph_max']),
        ]
        ordering = ['severity_level', 'ph_range_type', 'target_type']
    
    def __str__(self):
        target_display = self.get_target_type_display()
        ph_display = self.get_ph_range_type_display()
        severity_display = self.get_severity_level_display()
        
        return f"{ph_display} vs {target_display} -> {severity_display}"
    
    def applies_to_ph(self, ph_value: float) -> bool:
        """
        Check if this rule applies to a given pH value.
        """
        # If specific pH bounds are set, use those
        if self.ph_min is not None and self.ph_max is not None:
            return self.ph_min <= ph_value <= self.ph_max
        elif self.ph_min is not None:
            return ph_value >= self.ph_min
        elif self.ph_max is not None:
            return ph_value <= self.ph_max
        
        # Otherwise use the range type
        if self.ph_range_type == self.PHRangeType.STRONGLY_ACIDIC:
            return ph_value < 2
        elif self.ph_range_type == self.PHRangeType.ACIDIC:
            return 2 <= ph_value < 7
        elif self.ph_range_type == self.PHRangeType.NEUTRAL:
            return 7 <= ph_value <= 7.5
        elif self.ph_range_type == self.PHRangeType.ALKALINE:
            return 7.5 < ph_value <= 12.5
        elif self.ph_range_type == self.PHRangeType.STRONGLY_ALKALINE:
            return ph_value > 12.5
        
        return False
    
    def get_separation_requirements(self) -> dict:
        """
        Get structured separation requirements for this rule.
        """
        return {
            'severity': self.severity_level,
            'min_distance': self.min_separation_distance,
            'requirements': self.requirements,
            'safety_recommendations': self.safety_recommendations,
            'prohibited': self.severity_level == self.SeverityLevel.PROHIBITED,
            'notes': self.notes
        }


class ChemicalReactivityProfile(models.Model):
    """
    Pre-defined chemical reactivity profiles for dangerous goods,
    providing regulatory knowledge for strong acids, alkalis, and other reactive materials.
    This serves as a fallback/supplement to SDS-extracted pH data.
    """
    
    class ReactivityType(models.TextChoices):
        STRONG_ACID = 'STRONG_ACID', _('Strong Acid')
        MODERATE_ACID = 'MODERATE_ACID', _('Moderate Acid')
        WEAK_ACID = 'WEAK_ACID', _('Weak Acid')
        STRONG_ALKALI = 'STRONG_ALKALI', _('Strong Alkali')
        MODERATE_ALKALI = 'MODERATE_ALKALI', _('Moderate Alkali')
        WEAK_ALKALI = 'WEAK_ALKALI', _('Weak Alkali')
        OXIDIZER = 'OXIDIZER', _('Oxidizing Agent')
        REDUCER = 'REDUCER', _('Reducing Agent')
        NEUTRAL = 'NEUTRAL', _('Neutral/Non-reactive')
    
    class StrengthLevel(models.TextChoices):
        VERY_STRONG = 'VERY_STRONG', _('Very Strong (pH < 1 or pH > 13)')
        STRONG = 'STRONG', _('Strong (pH 1-2 or pH 12-13)')
        MODERATE = 'MODERATE', _('Moderate (pH 2-4 or pH 10-12)')
        WEAK = 'WEAK', _('Weak (pH 4-6 or pH 8-10)')
        NEUTRAL = 'NEUTRAL', _('Neutral (pH 6-8)')
    
    class DataSource(models.TextChoices):
        IATA_LIST = 'IATA_LIST', _('IATA Dangerous Goods List')
        REGULATORY_TABLE = 'REGULATORY_TABLE', _('Regulatory Segregation Table')
        CHEMICAL_DATABASE = 'CHEMICAL_DATABASE', _('Chemical Property Database')
        EXPERT_KNOWLEDGE = 'EXPERT_KNOWLEDGE', _('Expert Chemical Knowledge')
        MANUAL_ENTRY = 'MANUAL_ENTRY', _('Manual Entry')
    
    # Link to dangerous good
    dangerous_good = models.OneToOneField(
        DangerousGood,
        on_delete=models.CASCADE,
        related_name='reactivity_profile',
        help_text=_("Dangerous good this profile applies to")
    )
    
    # Primary reactivity classification
    reactivity_type = models.CharField(
        _("Reactivity Type"),
        max_length=20,
        choices=ReactivityType.choices,
        db_index=True,
        help_text=_("Primary chemical reactivity classification")
    )
    
    # Strength level
    strength_level = models.CharField(
        _("Strength Level"),
        max_length=15,
        choices=StrengthLevel.choices,
        help_text=_("Relative strength of the chemical reactivity")
    )
    
    # Typical pH range (if applicable)
    typical_ph_min = models.FloatField(
        _("Typical pH (Minimum)"),
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(14.0)],
        help_text=_("Typical minimum pH for this material type")
    )
    typical_ph_max = models.FloatField(
        _("Typical pH (Maximum)"),
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(14.0)],
        help_text=_("Typical maximum pH for this material type")
    )
    
    # Incompatible material types (JSON field for flexibility)
    incompatible_with = models.JSONField(
        _("Incompatible Material Types"),
        default=list,
        help_text=_("List of reactivity types this material is incompatible with")
    )
    
    # Segregation distance recommendations
    min_segregation_distance = models.PositiveIntegerField(
        _("Minimum Segregation Distance (meters)"),
        null=True,
        blank=True,
        help_text=_("Recommended minimum segregation distance for incompatible materials")
    )
    
    # Data source and confidence
    data_source = models.CharField(
        _("Data Source"),
        max_length=25,
        choices=DataSource.choices,
        default=DataSource.REGULATORY_TABLE,
        help_text=_("Source of this reactivity classification")
    )
    confidence_level = models.FloatField(
        _("Confidence Level"),
        default=1.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text=_("Confidence in this classification (0.0-1.0)")
    )
    
    # Additional properties
    notes = models.TextField(
        _("Additional Notes"),
        blank=True,
        help_text=_("Additional information about this material's reactivity")
    )
    regulatory_basis = models.CharField(
        _("Regulatory Basis"),
        max_length=200,
        blank=True,
        help_text=_("Regulatory standard or document this classification is based on")
    )
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_reactivity_profiles'
    )
    
    class Meta:
        verbose_name = _("Chemical Reactivity Profile")
        verbose_name_plural = _("Chemical Reactivity Profiles")
        indexes = [
            models.Index(fields=['reactivity_type', 'strength_level']),
            models.Index(fields=['dangerous_good', 'reactivity_type']),
        ]
        ordering = ['dangerous_good__un_number', 'reactivity_type']
    
    def __str__(self):
        return f"{self.dangerous_good.un_number} - {self.get_reactivity_type_display()} ({self.get_strength_level_display()})"
    
    @property
    def is_acidic(self) -> bool:
        """Check if this material is acidic (any level)"""
        return self.reactivity_type in [
            self.ReactivityType.STRONG_ACID,
            self.ReactivityType.MODERATE_ACID,
            self.ReactivityType.WEAK_ACID
        ]
    
    @property
    def is_alkaline(self) -> bool:
        """Check if this material is alkaline (any level)"""
        return self.reactivity_type in [
            self.ReactivityType.STRONG_ALKALI,
            self.ReactivityType.MODERATE_ALKALI,
            self.ReactivityType.WEAK_ALKALI
        ]
    
    @property
    def is_strongly_reactive(self) -> bool:
        """Check if this material is strongly reactive (strong acid or alkali)"""
        return self.reactivity_type in [
            self.ReactivityType.STRONG_ACID,
            self.ReactivityType.STRONG_ALKALI
        ] or self.strength_level in [
            self.StrengthLevel.VERY_STRONG,
            self.StrengthLevel.STRONG
        ]
    
    def get_typical_ph(self) -> float:
        """Get representative pH value if available"""
        if self.typical_ph_min is not None and self.typical_ph_max is not None:
            return (self.typical_ph_min + self.typical_ph_max) / 2
        elif self.typical_ph_min is not None:
            return self.typical_ph_min
        elif self.typical_ph_max is not None:
            return self.typical_ph_max
        return None
    
    def check_compatibility_with(self, other_profile: 'ChemicalReactivityProfile') -> dict:
        """
        Check compatibility with another reactivity profile.
        
        Returns:
            dict with compatibility assessment
        """
        result = {
            'compatible': True,
            'risk_level': 'low',
            'reasons': [],
            'min_separation_distance': 0
        }
        
        # Check for acid-alkali incompatibility
        if (self.is_acidic and other_profile.is_alkaline) or (self.is_alkaline and other_profile.is_acidic):
            result['compatible'] = False
            result['risk_level'] = 'high'
            result['reasons'].append('Acid-alkali incompatibility - risk of violent reaction')
            
            # Determine separation distance based on strength
            if self.is_strongly_reactive and other_profile.is_strongly_reactive:
                result['risk_level'] = 'critical'
                result['min_separation_distance'] = 15
                result['reasons'].append('Both materials are strongly reactive - minimum 15m separation required')
            elif self.is_strongly_reactive or other_profile.is_strongly_reactive:
                result['min_separation_distance'] = 10
                result['reasons'].append('One material is strongly reactive - minimum 10m separation required')
            else:
                result['min_separation_distance'] = 5
                result['reasons'].append('Moderate reaction risk - minimum 5m separation required')
        
        # Check for oxidizer-reducer incompatibility
        elif ((self.reactivity_type == self.ReactivityType.OXIDIZER and 
               other_profile.reactivity_type == self.ReactivityType.REDUCER) or
              (self.reactivity_type == self.ReactivityType.REDUCER and 
               other_profile.reactivity_type == self.ReactivityType.OXIDIZER)):
            result['compatible'] = False
            result['risk_level'] = 'high'
            result['reasons'].append('Oxidizer-reducer incompatibility - fire/explosion risk')
            result['min_separation_distance'] = 10
        
        # Check explicit incompatibilities
        if other_profile.reactivity_type in self.incompatible_with:
            result['compatible'] = False
            result['risk_level'] = 'high'
            result['reasons'].append(f'Explicitly incompatible material types')
            if self.min_segregation_distance:
                result['min_separation_distance'] = max(
                    result['min_separation_distance'], 
                    self.min_segregation_distance
                )
        
        return result

