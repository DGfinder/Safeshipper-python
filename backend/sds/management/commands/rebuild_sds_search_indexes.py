# sds/management/commands/rebuild_sds_search_indexes.py
from django.core.management.base import BaseCommand
from django.utils.translation import gettext as _
from django_elasticsearch_dsl.management.commands.search_index import Command as BaseSearchIndexCommand
from django_elasticsearch_dsl import get_documents
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = _('Rebuild Elasticsearch search indexes for SDS and dangerous goods')
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            default=False,
            help=_('Force rebuild even if indexes exist')
        )
        parser.add_argument(
            '--models',
            type=str,
            nargs='*',
            default=['all'],
            choices=['all', 'sds', 'dg', 'requests'],
            help=_('Which models to rebuild (all, sds, dg, requests)')
        )
        parser.add_argument(
            '--parallel',
            action='store_true',
            default=False,
            help=_('Use parallel processing for faster indexing')
        )
    
    def handle(self, *args, **options):
        force = options['force']
        models = options['models']
        parallel = options['parallel']
        
        self.stdout.write(
            self.style.SUCCESS(
                _('Starting search index rebuild for SafeShipper...')
            )
        )
        
        # Get all registered documents
        all_documents = get_documents()
        
        # Filter documents based on model selection
        target_documents = []
        
        for doc_class in all_documents:
            doc_name = doc_class.__name__.lower()
            model_name = doc_class.Django.model.__name__.lower()
            
            should_include = False
            
            if 'all' in models:
                should_include = True
            elif 'sds' in models and ('safetydatasheet' in model_name or 'sds' in doc_name):
                should_include = True
            elif 'dg' in models and 'dangerousgood' in model_name:
                should_include = True
            elif 'requests' in models and 'sdsrequest' in model_name:
                should_include = True
            
            if should_include:
                target_documents.append(doc_class)
        
        if not target_documents:
            self.stdout.write(
                self.style.WARNING(
                    _('No documents found matching the specified models.')
                )
            )
            return
        
        self.stdout.write(
            self.style.SUCCESS(
                _('Found {} document types to index:').format(len(target_documents))
            )
        )
        
        for doc_class in target_documents:
            model_name = doc_class.Django.model.__name__
            index_name = doc_class.Index.name
            self.stdout.write(f'  - {model_name} -> {index_name}')
        
        # Process each document type
        for doc_class in target_documents:
            model_name = doc_class.Django.model.__name__
            index_name = doc_class.Index.name
            
            self.stdout.write(
                self.style.SUCCESS(
                    _('\nRebuilding index for {}...').format(model_name)
                )
            )
            
            try:
                # Create/update the index
                if force:
                    self.stdout.write(_('Deleting existing index...'))
                    try:
                        doc_class._index.delete()
                    except Exception as e:
                        self.stdout.write(
                            self.style.WARNING(
                                _('Could not delete index {}: {}').format(index_name, str(e))
                            )
                        )
                
                # Create the index
                self.stdout.write(_('Creating index structure...'))
                doc_class._index.create()
                
                # Get model queryset
                model = doc_class.Django.model
                queryset = model.objects.all()
                
                # Handle related models for better performance
                if hasattr(doc_class.Django, 'related_models') and doc_class.Django.related_models:
                    related_fields = []
                    for related_model in doc_class.Django.related_models:
                        if hasattr(model, related_model):
                            related_fields.append(related_model)
                    
                    if related_fields:
                        queryset = queryset.select_related(*related_fields)
                
                total_count = queryset.count()
                
                self.stdout.write(
                    _('Indexing {} {} records...').format(total_count, model_name)
                )
                
                # Index documents in batches
                batch_size = 100
                indexed_count = 0
                
                for start in range(0, total_count, batch_size):
                    end = min(start + batch_size, total_count)
                    batch = queryset[start:end]
                    
                    # Convert to document instances and index
                    doc_instances = []
                    for obj in batch:
                        doc_instance = doc_class()
                        doc_instance.meta.id = obj.pk
                        doc_instance._prepare_document(obj)
                        doc_instances.append(doc_instance)
                    
                    # Bulk index
                    if doc_instances:
                        doc_class._index.bulk(doc_instances)
                        indexed_count += len(doc_instances)
                    
                    # Progress indicator
                    progress = (indexed_count / total_count) * 100
                    self.stdout.write(
                        f'\r  Progress: {indexed_count}/{total_count} ({progress:.1f}%)',
                        ending=''
                    )
                    self.stdout.flush()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'\n  ✓ Successfully indexed {indexed_count} {model_name} records'
                    )
                )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        _('Error indexing {}: {}').format(model_name, str(e))
                    )
                )
                logger.error(f'Elasticsearch indexing error for {model_name}: {str(e)}')
                continue
        
        # Final verification
        self.stdout.write(
            self.style.SUCCESS(
                _('\nVerifying indexes...')
            )
        )
        
        verification_results = []
        for doc_class in target_documents:
            try:
                model_name = doc_class.Django.model.__name__
                index_name = doc_class.Index.name
                
                # Get index stats
                index_count = doc_class.search().count()
                db_count = doc_class.Django.model.objects.count()
                
                status = '✓' if index_count == db_count else '⚠'
                verification_results.append({
                    'model': model_name,
                    'index': index_name,
                    'index_count': index_count,
                    'db_count': db_count,
                    'status': status
                })
                
                self.stdout.write(
                    f'  {status} {model_name}: {index_count}/{db_count} indexed'
                )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'  ✗ {model_name}: Verification failed - {str(e)}'
                    )
                )
        
        # Summary
        successful_indexes = sum(1 for r in verification_results if r['status'] == '✓')
        total_indexes = len(verification_results)
        
        if successful_indexes == total_indexes:
            self.stdout.write(
                self.style.SUCCESS(
                    _('\n🎉 Search index rebuild completed successfully!')
                )
            )
            self.stdout.write(
                _('All {} indexes are synchronized with the database.').format(total_indexes)
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    _('\n⚠ Search index rebuild completed with warnings.')
                )
            )
            self.stdout.write(
                _('Successfully rebuilt {}/{} indexes.').format(successful_indexes, total_indexes)
            )
        
        # Usage instructions
        self.stdout.write(
            self.style.SUCCESS(
                _('\nSearch functionality is now available for:')
            )
        )
        self.stdout.write(_('  • Dangerous goods by UN number, name, class, and properties'))
        self.stdout.write(_('  • Safety Data Sheets by product, manufacturer, and safety information'))
        self.stdout.write(_('  • SDS requests for tracking missing documents'))
        self.stdout.write(_('\nUse the search APIs or admin interface to test search functionality.'))