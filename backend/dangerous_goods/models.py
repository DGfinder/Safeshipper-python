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


class ADGPlacardRule(models.Model):
    """
    Australian Dangerous Goods Code placard load thresholds and requirements.
    Based on ADG Code 7.9 Table 5.3.1 and 5.3.2.
    """
    
    class PlacardType(models.TextChoices):
        STANDARD_DG = 'STANDARD_DG', _('Standard Dangerous Goods')
        FLAMMABLE_CLASS_2_1 = 'FLAMMABLE_CLASS_2_1', _('Class 2.1 Flammable Gas (Excluding Aerosols)')
        LARGE_RECEPTACLE = 'LARGE_RECEPTACLE', _('Receptacles > 500kg/L')
        LIMITED_QUANTITY = 'LIMITED_QUANTITY', _('Limited Quantities')
        DOMESTIC_CONSUMABLE = 'DOMESTIC_CONSUMABLE', _('Domestic Consumables')
        
    class QuantityType(models.TextChoices):
        WEIGHT_KG = 'WEIGHT_KG', _('Weight (kg)')
        VOLUME_L = 'VOLUME_L', _('Volume (L)')
        WEIGHT_OR_VOLUME = 'WEIGHT_OR_VOLUME', _('Weight (kg) or Volume (L)')
    
    placard_type = models.CharField(
        _("Placard Type"),
        max_length=30,
        choices=PlacardType.choices,
        db_index=True
    )
    
    # Hazard class this rule applies to (null for general rules)
    hazard_class = models.CharField(
        _("Hazard Class"),
        max_length=20,
        blank=True,
        null=True,
        help_text=_("Specific hazard class this rule applies to, or blank for general rules")
    )
    
    # Threshold quantity
    threshold_quantity = models.FloatField(
        _("Threshold Quantity"),
        help_text=_("Minimum quantity requiring placarding")
    )
    
    quantity_type = models.CharField(
        _("Quantity Type"),
        max_length=20,
        choices=QuantityType.choices,
        default=QuantityType.WEIGHT_OR_VOLUME
    )
    
    # Whether this applies to individual receptacles vs aggregate
    is_individual_receptacle = models.BooleanField(
        _("Individual Receptacle"),
        default=False,
        help_text=_("True if this threshold applies to individual receptacles, False for aggregate quantities")
    )
    
    # Description of the rule
    description = models.TextField(
        _("Rule Description"),
        help_text=_("Human-readable description of this placard rule")
    )
    
    # Priority (lower number = higher priority for evaluation)
    priority = models.PositiveIntegerField(
        _("Priority"),
        default=100,
        help_text=_("Priority for rule evaluation (lower = higher priority)")
    )
    
    # Regulatory reference
    regulatory_reference = models.CharField(
        _("Regulatory Reference"),
        max_length=100,
        default="ADG Code 7.9",
        help_text=_("Reference to specific regulation or table")
    )
    
    # Active flag
    is_active = models.BooleanField(
        _("Is Active"),
        default=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("ADG Placard Rule")
        verbose_name_plural = _("ADG Placard Rules")
        ordering = ['priority', 'placard_type', 'hazard_class']
        indexes = [
            models.Index(fields=['placard_type', 'hazard_class']),
            models.Index(fields=['priority', 'is_active']),
        ]
    
    def __str__(self):
        class_part = f" (Class {self.hazard_class})" if self.hazard_class else ""
        return f"{self.get_placard_type_display()}{class_part} - {self.threshold_quantity}{self.get_quantity_type_display()}"


class PlacardRequirement(models.Model):
    """
    Specific placard requirements for dangerous goods shipments.
    Links to shipments and calculates required placards based on ADG rules.
    """
    
    class PlacardStatus(models.TextChoices):
        REQUIRED = 'REQUIRED', _('Placard Required')
        NOT_REQUIRED = 'NOT_REQUIRED', _('Placard Not Required')
        REVIEW_REQUIRED = 'REVIEW_REQUIRED', _('Manual Review Required')
        
    class PlacardTypeRequired(models.TextChoices):
        CLASS_DIAMOND = 'CLASS_DIAMOND', _('Class Diamond Placard')
        EMERGENCY_INFO_PANEL = 'EMERGENCY_INFO_PANEL', _('Emergency Information Panel')
        LIMITED_QUANTITY = 'LIMITED_QUANTITY', _('Limited Quantity Placard')
        FUMIGATED_UNIT = 'FUMIGATED_UNIT', _('Fumigated Unit Placard')
        MARINE_POLLUTANT = 'MARINE_POLLUTANT', _('Marine Pollutant Placard')
    
    # Link to shipment
    shipment = models.OneToOneField(
        'shipments.Shipment',
        on_delete=models.CASCADE,
        related_name='placard_requirement',
        help_text=_("Shipment this placard requirement applies to")
    )
    
    # Overall placard status
    placard_status = models.CharField(
        _("Placard Status"),
        max_length=20,
        choices=PlacardStatus.choices,
        default=PlacardStatus.NOT_REQUIRED
    )
    
    # Required placard types (JSON field for multiple types)
    required_placard_types = models.JSONField(
        _("Required Placard Types"),
        default=list,
        help_text=_("List of placard types required for this shipment")
    )
    
    # Aggregate calculations
    total_dg_weight_kg = models.FloatField(
        _("Total DG Weight (kg)"),
        null=True,
        blank=True
    )
    
    total_dg_volume_l = models.FloatField(
        _("Total DG Volume (L)"),
        null=True,
        blank=True
    )
    
    # Limited quantity calculations
    total_lq_weight_kg = models.FloatField(
        _("Total LQ Weight (kg)"),
        null=True,
        blank=True,
        help_text=_("Total limited quantity dangerous goods weight")
    )
    
    # Combined calculation (DG + 10% of LQ)
    combined_quantity_kg = models.FloatField(
        _("Combined Quantity (kg)"),
        null=True,
        blank=True,
        help_text=_("Combined quantity = DG + (LQ * 0.1)")
    )
    
    # Individual large receptacles flag
    has_large_receptacles = models.BooleanField(
        _("Has Large Receptacles"),
        default=False,
        help_text=_("True if any receptacle exceeds 500kg/L")
    )
    
    # Class 2.1 specific quantities
    class_2_1_quantity_kg = models.FloatField(
        _("Class 2.1 Quantity (kg)"),
        null=True,
        blank=True,
        help_text=_("Total Class 2.1 flammable gas quantity (excluding aerosols)")
    )
    
    # Detailed calculation results (JSON)
    calculation_details = models.JSONField(
        _("Calculation Details"),
        default=dict,
        help_text=_("Detailed breakdown of placard calculations")
    )
    
    # Manual review notes
    review_notes = models.TextField(
        _("Review Notes"),
        blank=True,
        help_text=_("Notes from manual review if required")
    )
    
    # Audit fields
    calculated_at = models.DateTimeField(
        _("Calculated At"),
        auto_now=True
    )
    
    calculated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='calculated_placard_requirements'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Placard Requirement")
        verbose_name_plural = _("Placard Requirements")
        ordering = ['-calculated_at']
    
    def __str__(self):
        return f"Placard Req for {self.shipment.tracking_number} - {self.get_placard_status_display()}"
    
    def get_required_placards_display(self) -> list:
        """Get human-readable list of required placards"""
        if not self.required_placard_types:
            return []
        
        placard_map = dict(self.PlacardTypeRequired.choices)
        return [placard_map.get(placard_type, placard_type) for placard_type in self.required_placard_types]


class PlacardCalculationLog(models.Model):
    """
    Audit log for placard calculations showing decision reasoning.
    """
    
    placard_requirement = models.ForeignKey(
        PlacardRequirement,
        on_delete=models.CASCADE,
        related_name='calculation_logs'
    )
    
    rule_applied = models.ForeignKey(
        ADGPlacardRule,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    
    rule_triggered = models.BooleanField(
        _("Rule Triggered"),
        help_text=_("Whether this rule triggered a placard requirement")
    )
    
    measured_quantity = models.FloatField(
        _("Measured Quantity"),
        help_text=_("The quantity that was measured against the rule threshold")
    )
    
    threshold_quantity = models.FloatField(
        _("Threshold Quantity"),
        help_text=_("The threshold quantity from the rule")
    )
    
    calculation_notes = models.TextField(
        _("Calculation Notes"),
        help_text=_("Detailed notes about this calculation step")
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("Placard Calculation Log")
        verbose_name_plural = _("Placard Calculation Logs")
        ordering = ['created_at']
    
    def __str__(self):
        status = "TRIGGERED" if self.rule_triggered else "NOT TRIGGERED"
        return f"{self.rule_applied} - {status} ({self.measured_quantity} vs {self.threshold_quantity})"


class DigitalPlacard(models.Model):
    """
    Digital placard management for ADG-compliant transport signage.
    Generates, tracks, and verifies placards with QR codes for digital verification.
    """
    
    class PlacardSize(models.TextChoices):
        STANDARD = 'STANDARD', _('Standard (250mm x 250mm)')
        LARGE = 'LARGE', _('Large (300mm x 300mm)')
        SMALL = 'SMALL', _('Small (200mm x 200mm)')
    
    class PlacardStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', _('Active')
        EXPIRED = 'EXPIRED', _('Expired')
        SUPERSEDED = 'SUPERSEDED', _('Superseded')
        CANCELLED = 'CANCELLED', _('Cancelled')
    
    # Link to placard requirement
    placard_requirement = models.ForeignKey(
        PlacardRequirement,
        on_delete=models.CASCADE,
        related_name='digital_placards'
    )
    
    # Placard type and specifications
    placard_type = models.CharField(
        _("Placard Type"),
        max_length=30,
        choices=PlacardRequirement.PlacardTypeRequired.choices
    )
    
    # Dangerous goods this placard covers
    dangerous_goods = models.ManyToManyField(
        DangerousGood,
        related_name='digital_placards',
        help_text=_("Dangerous goods covered by this placard")
    )
    
    # Placard specifications
    placard_size = models.CharField(
        _("Placard Size"),
        max_length=15,
        choices=PlacardSize.choices,
        default=PlacardSize.STANDARD
    )
    
    # Digital identifiers
    placard_id = models.CharField(
        _("Placard ID"),
        max_length=50,
        unique=True,
        help_text=_("Unique identifier for this placard")
    )
    
    qr_code_data = models.TextField(
        _("QR Code Data"),
        help_text=_("JSON data encoded in QR code for verification")
    )
    
    qr_code_url = models.URLField(
        _("QR Code Image URL"),
        blank=True,
        help_text=_("URL to generated QR code image")
    )
    
    # Placard image generation
    placard_image_url = models.URLField(
        _("Placard Image URL"),
        blank=True,
        help_text=_("URL to generated placard image")
    )
    
    placard_pdf_url = models.URLField(
        _("Placard PDF URL"),
        blank=True,
        help_text=_("URL to printable placard PDF")
    )
    
    # Vehicle placement information
    placement_location = models.CharField(
        _("Placement Location"),
        max_length=50,
        blank=True,
        help_text=_("Where on vehicle this placard should be placed (front, rear, sides)")
    )
    
    # Validity and status
    status = models.CharField(
        _("Status"),
        max_length=15,
        choices=PlacardStatus.choices,
        default=PlacardStatus.ACTIVE
    )
    
    valid_from = models.DateTimeField(
        _("Valid From"),
        auto_now_add=True
    )
    
    valid_until = models.DateTimeField(
        _("Valid Until"),
        null=True,
        blank=True,
        help_text=_("Expiry date for this placard")
    )
    
    # Generation metadata
    generated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_placards'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Digital Placard")
        verbose_name_plural = _("Digital Placards")
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['placard_id']),
            models.Index(fields=['status', 'valid_from']),
            models.Index(fields=['placard_requirement', 'placard_type']),
        ]
    
    def __str__(self):
        return f"Placard {self.placard_id} - {self.get_placard_type_display()}"
    
    def save(self, *args, **kwargs):
        if not self.placard_id:
            # Generate unique placard ID
            import uuid
            self.placard_id = f"PLC-{str(uuid.uuid4()).upper()[:8]}"
        super().save(*args, **kwargs)
    
    @property
    def is_valid(self):
        """Check if placard is currently valid"""
        from django.utils import timezone
        now = timezone.now()
        
        if self.status != self.PlacardStatus.ACTIVE:
            return False
        
        if self.valid_until and now > self.valid_until:
            return False
        
        return True
    
    def get_hazard_classes(self):
        """Get list of hazard classes covered by this placard"""
        return list(set(dg.hazard_class for dg in self.dangerous_goods.all()))


class PlacardVerification(models.Model):
    """
    Verification events for digital placards using QR code scanning.
    Tracks when and where placards are verified for compliance monitoring.
    """
    
    class VerificationType(models.TextChoices):
        QR_SCAN = 'QR_SCAN', _('QR Code Scan')
        MANUAL_CHECK = 'MANUAL_CHECK', _('Manual Visual Check')
        PHOTO_VERIFICATION = 'PHOTO_VERIFICATION', _('Photo Verification')
        GPS_VERIFICATION = 'GPS_VERIFICATION', _('GPS Location Verification')
    
    class VerificationResult(models.TextChoices):
        VALID = 'VALID', _('Valid')
        EXPIRED = 'EXPIRED', _('Expired')
        INVALID = 'INVALID', _('Invalid')
        MISSING = 'MISSING', _('Missing')
        DAMAGED = 'DAMAGED', _('Damaged')
        INCORRECT = 'INCORRECT', _('Incorrect Type')
    
    # Link to digital placard
    digital_placard = models.ForeignKey(
        DigitalPlacard,
        on_delete=models.CASCADE,
        related_name='verifications'
    )
    
    # Verification details
    verification_type = models.CharField(
        _("Verification Type"),
        max_length=20,
        choices=VerificationType.choices,
        default=VerificationType.QR_SCAN
    )
    
    verification_result = models.CharField(
        _("Verification Result"),
        max_length=15,
        choices=VerificationResult.choices
    )
    
    # Location and context
    verification_location = models.CharField(
        _("Verification Location"),
        max_length=255,
        blank=True,
        help_text=_("GPS coordinates or address where verification occurred")
    )
    
    vehicle_registration = models.CharField(
        _("Vehicle Registration"),
        max_length=50,
        blank=True,
        help_text=_("Registration of vehicle being verified")
    )
    
    # Verification metadata
    scanned_data = models.TextField(
        _("Scanned QR Data"),
        blank=True,
        help_text=_("Raw data from QR code scan")
    )
    
    verification_photo_url = models.URLField(
        _("Verification Photo URL"),
        blank=True,
        help_text=_("Photo evidence of placard placement")
    )
    
    notes = models.TextField(
        _("Verification Notes"),
        blank=True,
        help_text=_("Additional notes about the verification")
    )
    
    # Who performed verification
    verified_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='placard_verifications'
    )
    
    verified_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("Placard Verification")
        verbose_name_plural = _("Placard Verifications")
        ordering = ['-verified_at']
        indexes = [
            models.Index(fields=['digital_placard', 'verified_at']),
            models.Index(fields=['verification_result', 'verified_at']),
            models.Index(fields=['verified_by', 'verified_at']),
        ]
    
    def __str__(self):
        return f"Verification of {self.digital_placard.placard_id} - {self.get_verification_result_display()}"


class PlacardTemplate(models.Model):
    """
    Templates for generating standardized ADG-compliant placards.
    Contains design specifications and layout rules for different placard types.
    """
    
    class TemplateType(models.TextChoices):
        CLASS_DIAMOND = 'CLASS_DIAMOND', _('Class Diamond Placard')
        EMERGENCY_INFO_PANEL = 'EMERGENCY_INFO_PANEL', _('Emergency Information Panel')
        LIMITED_QUANTITY = 'LIMITED_QUANTITY', _('Limited Quantity Placard')
        MARINE_POLLUTANT = 'MARINE_POLLUTANT', _('Marine Pollutant Placard')
        ORIENTATION_ARROW = 'ORIENTATION_ARROW', _('Orientation Arrow')
    
    template_type = models.CharField(
        _("Template Type"),
        max_length=30,
        choices=TemplateType.choices,
        unique=True
    )
    
    template_name = models.CharField(
        _("Template Name"),
        max_length=100
    )
    
    # Design specifications
    width_mm = models.PositiveIntegerField(
        _("Width (mm)"),
        default=250,
        help_text=_("Placard width in millimeters")
    )
    
    height_mm = models.PositiveIntegerField(
        _("Height (mm)"),
        default=250,
        help_text=_("Placard height in millimeters")
    )
    
    border_width_mm = models.FloatField(
        _("Border Width (mm)"),
        default=12.5,
        help_text=_("Border width per ADG requirements")
    )
    
    # Template configuration (JSON)
    design_config = models.JSONField(
        _("Design Configuration"),
        default=dict,
        help_text=_("JSON configuration for placard design elements")
    )
    
    # Template files
    svg_template = models.TextField(
        _("SVG Template"),
        blank=True,
        help_text=_("SVG template with placeholders for dynamic content")
    )
    
    css_styles = models.TextField(
        _("CSS Styles"),
        blank=True,
        help_text=_("CSS styles for placard rendering")
    )
    
    # Regulatory compliance
    adg_compliant = models.BooleanField(
        _("ADG Compliant"),
        default=True,
        help_text=_("Meets ADG Code requirements")
    )
    
    regulatory_reference = models.CharField(
        _("Regulatory Reference"),
        max_length=200,
        blank=True,
        help_text=_("Reference to ADG Code section")
    )
    
    # Template status
    is_active = models.BooleanField(
        _("Is Active"),
        default=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Placard Template")
        verbose_name_plural = _("Placard Templates")
        ordering = ['template_type', 'template_name']
    
    def __str__(self):
        return f"{self.get_template_type_display()} - {self.template_name}"
    
    def get_dimensions(self):
        """Get template dimensions as tuple"""
        return (self.width_mm, self.height_mm)


# Import EIP models
from .emergency_info_panel import EmergencyContact, EmergencyProcedure

# Import Transport Document models
from .transport_documents import TransportDocument

# Import Limited Quantity models
from .limited_quantity_handler import LimitedQuantityLimit

